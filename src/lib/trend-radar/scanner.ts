// =============================================================
// Trend Radar Scanner — Orchestrates source scanning + trend detection
//
// Fire-and-forget architecture with in-memory progress tracking.
// Pattern: src/lib/alignment/scanner.ts
// =============================================================

import { prisma } from '@/lib/prisma';
import { scrapeProductUrl } from '@/lib/products/url-scraper';
import { hasContentChanged } from './content-differ';
import { analyzeTrends } from './trend-analyzer';

// ─── In-memory progress tracking ──────────────────────────────

const scanProgress = new Map<
  string,
  {
    sourcesTotal: number;
    sourcesCompleted: number;
    currentSource: string | null;
    trendsDetected: number;
    errors: string[];
    cancelled: boolean;
  }
>();

export function getScanProgress(jobId: string) {
  return scanProgress.get(jobId) ?? null;
}

export function cancelScan(jobId: string): boolean {
  const progress = scanProgress.get(jobId);
  if (progress) {
    progress.cancelled = true;
    return true;
  }
  return false;
}

/**
 * Run a trend scan job. Scans all active sources (or a single source)
 * in the workspace, detects new trends via AI, and writes results to DB.
 */
export async function runTrendScan(
  jobId: string,
  workspaceId: string,
  singleSourceId?: string,
) {
  // Find sources to scan
  const where: Record<string, unknown> = {
    workspaceId,
    isActive: true,
  };
  if (singleSourceId) {
    where.id = singleSourceId;
  } else {
    // Only scan sources whose nextCheckAt has passed (or is null = never scanned)
    where.OR = [
      { nextCheckAt: null },
      { nextCheckAt: { lte: new Date() } },
    ];
  }

  const sources = await prisma.trendSource.findMany({ where: where as never });

  // Initialize progress
  scanProgress.set(jobId, {
    sourcesTotal: sources.length,
    sourcesCompleted: 0,
    currentSource: null,
    trendsDetected: 0,
    errors: [],
    cancelled: false,
  });

  // Update job in DB
  await prisma.trendScanJob.update({
    where: { id: jobId },
    data: {
      status: 'RUNNING',
      sourcesTotal: sources.length,
    },
  });

  let totalTrendsDetected = 0;
  const allErrors: string[] = [];

  for (const source of sources) {
    const state = scanProgress.get(jobId);
    if (!state || state.cancelled) {
      await prisma.trendScanJob.update({
        where: { id: jobId },
        data: { status: 'CANCELLED', completedAt: new Date() },
      });
      scanProgress.delete(jobId);
      return;
    }

    state.currentSource = source.name;

    try {
      // 1. Scrape the URL
      const scraped = await scrapeProductUrl(source.url);

      // 2. Check if content changed
      const { changed, newHash } = hasContentChanged(
        scraped.bodyText,
        source.lastContentHash,
      );

      if (!changed) {
        // Content unchanged — update timestamps only
        const nextCheck = new Date(Date.now() + source.checkInterval * 60 * 1000);
        await prisma.trendSource.update({
          where: { id: source.id },
          data: {
            lastCheckedAt: new Date(),
            nextCheckAt: nextCheck,
            status: 'HEALTHY',
            lastError: null,
          },
        });
        state.sourcesCompleted++;
        continue;
      }

      // 3. Analyze content for trends via AI
      const analysis = await analyzeTrends({
        sourceName: source.name,
        sourceUrl: source.url,
        content: scraped.bodyText,
        workspaceId,
        trendSourceId: source.id,
      });

      // 4. Write detected trends to DB
      if (analysis.trends.length > 0) {
        await prisma.$transaction(
          analysis.trends.map((trend) =>
            prisma.detectedTrend.create({ data: trend as never }),
          ),
        );

        totalTrendsDetected += analysis.trends.length;
        state.trendsDetected += analysis.trends.length;

        // 5. Create notifications for high-relevance trends
        // Find a workspace user to assign the notification to
        const workspaceUser = await prisma.user.findFirst({
          where: { workspaceId },
          select: { id: true },
        });
        if (workspaceUser) {
          for (const trend of analysis.trends) {
            if (trend.relevanceScore > 80) {
              await prisma.notification.create({
                data: {
                  type: 'RESEARCH_INSIGHT_ADDED',
                  category: 'RESEARCH',
                  title: `New trend detected: ${trend.title}`,
                  description: trend.description?.slice(0, 200) ?? 'A new trend was detected by Trend Radar.',
                  actionUrl: 'trends',
                  workspaceId,
                  userId: workspaceUser.id,
                },
              });
            }
          }
        }
      }

      if (analysis.error) {
        allErrors.push(`${source.name}: ${analysis.error}`);
        state.errors.push(`${source.name}: ${analysis.error}`);
      }

      // 6. Update source status
      const nextCheck = new Date(Date.now() + source.checkInterval * 60 * 1000);
      await prisma.trendSource.update({
        where: { id: source.id },
        data: {
          lastCheckedAt: new Date(),
          lastContentHash: newHash,
          nextCheckAt: nextCheck,
          status: 'HEALTHY',
          lastError: null,
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      const errorMsg = `${source.name}: ${msg}`;
      allErrors.push(errorMsg);
      state.errors.push(errorMsg);

      // Update source with error status
      await prisma.trendSource.update({
        where: { id: source.id },
        data: {
          lastCheckedAt: new Date(),
          status: msg.includes('Timeout') ? 'WARNING' : 'ERROR',
          lastError: msg.slice(0, 500),
          nextCheckAt: new Date(Date.now() + source.checkInterval * 60 * 1000),
        },
      });
    }

    state.sourcesCompleted++;
  }

  // Finalize job
  const finalState = scanProgress.get(jobId);
  if (finalState?.cancelled) {
    await prisma.trendScanJob.update({
      where: { id: jobId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
  } else {
    await prisma.trendScanJob.update({
      where: { id: jobId },
      data: {
        status: allErrors.length > 0 && totalTrendsDetected === 0 ? 'FAILED' : 'COMPLETED',
        sourcesCompleted: sources.length,
        trendsDetected: totalTrendsDetected,
        errors: allErrors,
        completedAt: new Date(),
      },
    });
  }

  // Cleanup in-memory state after 2 minutes
  setTimeout(() => scanProgress.delete(jobId), 120_000);
}
