// =============================================================
// Trend Researcher — On-demand AI research for trend detection
//
// Flow: query → Gemini generates URLs → scrape each URL →
// Gemini analyzes content → save trends to DB.
// Fire-and-forget with in-memory progress tracking.
// =============================================================

import { prisma } from '@/lib/prisma';
import { scrapeProductUrl } from '@/lib/products/url-scraper';
import { analyzeTrends } from './trend-analyzer';
import { findUrlsViaGoogleSearch } from '@/lib/ai/gemini-client';
import { getBrandContext } from '@/lib/ai/brand-context';

// ─── In-memory progress tracking ──────────────────────────────

export type ResearchPhase = 'generating_urls' | 'scraping' | 'analyzing' | 'complete' | 'failed' | 'cancelled';

export interface PendingTrend {
  title: string;
  slug: string;
  description: string;
  category: string;
  scope: string;
  impactLevel: string;
  timeframe: string;
  relevanceScore: number;
  direction: string | null;
  confidence: number | null;
  rawExcerpt: string | null;
  aiAnalysis: string | null;
  industries: string[];
  tags: string[];
  howToUse: string[];
  sourceUrl: string;
  detectionSource: string;
  researchJobId: string | undefined;
  workspaceId: string;
}

interface ResearchProgress {
  phase: ResearchPhase;
  urlsTotal: number;
  urlsCompleted: number;
  currentUrl: string | null;
  trendsDetected: number;
  pendingTrends: PendingTrend[];
  errors: string[];
  cancelled: boolean;
}

const researchProgress = new Map<string, ResearchProgress>();

/** Get in-memory progress for a research job */
export function getResearchProgress(jobId: string): ResearchProgress | null {
  return researchProgress.get(jobId) ?? null;
}

/** Cancel a running research job */
export function cancelResearch(jobId: string): boolean {
  const progress = researchProgress.get(jobId);
  if (progress) {
    progress.cancelled = true;
    progress.phase = 'cancelled';
    return true;
  }
  return false;
}

const MAX_URLS = 8;
const MAX_TRENDS_PER_URL = 5;
const MAX_TRENDS_TOTAL = 15;

/**
 * Run a trend research job. Generates URLs from query, scrapes each,
 * analyzes for trends via AI, and writes results to DB.
 */
export async function runTrendResearch(
  jobId: string,
  workspaceId: string,
  query: string,
  useBrandContext: boolean,
) {
  // Initialize progress
  researchProgress.set(jobId, {
    phase: 'generating_urls',
    urlsTotal: 0,
    urlsCompleted: 0,
    currentUrl: null,
    trendsDetected: 0,
    pendingTrends: [],
    errors: [],
    cancelled: false,
  });

  // Update job status
  await prisma.trendResearchJob.update({
    where: { id: jobId },
    data: { status: 'RUNNING' },
  });

  let totalTrendsDetected = 0;
  const allErrors: string[] = [];

  try {
    // 1. Get brand context if requested
    const brandContext = useBrandContext ? await getBrandContext(workspaceId) : undefined;

    // 2. Find real URLs via Gemini Google Search grounding
    const searchQuery = brandContext
      ? `${query} (industry context: ${brandContext.brandName ?? ''} ${brandContext.industry ?? ''})`
      : query;

    const searchResults = await findUrlsViaGoogleSearch(searchQuery, MAX_URLS);

    if (searchResults.length === 0) {
      throw new Error('Google Search found no relevant URLs for this query');
    }

    const generatedUrls = searchResults.map((r) => ({ url: r.url, reason: r.title }));
    const urlStrings = generatedUrls.map((u) => u.url);

    // Update job with generated URLs
    await prisma.trendResearchJob.update({
      where: { id: jobId },
      data: {
        urlsGenerated: urlStrings,
        urlsTotal: urlStrings.length,
      },
    });

    const state = researchProgress.get(jobId)!;
    state.urlsTotal = urlStrings.length;
    state.phase = 'scraping';

    // (Notifications are created when user approves trends via /approve endpoint)

    // 3. Scrape each URL and analyze
    for (const urlEntry of generatedUrls) {
      if (state.cancelled) break;
      if (totalTrendsDetected >= MAX_TRENDS_TOTAL) break;

      // Show a readable label (strip Google redirect prefix)
      const displayUrl = urlEntry.reason || urlEntry.url.replace(/^https:\/\/vertexaisearch\.cloud\.google\.com\/[^/]+\//, '').slice(0, 80);
      state.currentUrl = displayUrl;
      state.phase = 'scraping';

      // Sync progress to DB so polling always has fresh data
      await prisma.trendResearchJob.update({
        where: { id: jobId },
        data: {
          urlsCompleted: state.urlsCompleted,
          trendsDetected: totalTrendsDetected,
        },
      }).catch(() => {/* ignore update errors */});

      try {
        // Scrape
        const scraped = await scrapeProductUrl(urlEntry.url);

        if (state.cancelled) break;

        // Skip pages with insufficient content
        if (!scraped.bodyText || scraped.bodyText.trim().length < 100) {
          const skipMsg = `${displayUrl}: Insufficient content`;
          allErrors.push(skipMsg);
          state.errors.push(skipMsg);
          state.urlsCompleted++;
          continue;
        }

        state.phase = 'analyzing';

        // Truncate content to prevent Gemini JSON truncation (max ~15k chars)
        const truncatedContent = scraped.bodyText.length > 15000
          ? scraped.bodyText.slice(0, 15000) + '\n\n[Content truncated]'
          : scraped.bodyText;

        // Analyze for trends
        const remainingSlots = MAX_TRENDS_TOTAL - totalTrendsDetected;
        const analysis = await analyzeTrends({
          sourceName: urlEntry.reason || urlEntry.url,
          sourceUrl: urlEntry.url,
          content: truncatedContent,
          workspaceId,
          researchJobId: jobId,
          brandContext,
          maxTrends: Math.min(MAX_TRENDS_PER_URL, remainingSlots),
          detectionSource: 'AI_RESEARCH',
        });

        // Store trends as pending (user will curate before saving)
        if (analysis.trends.length > 0) {
          state.pendingTrends.push(...(analysis.trends as PendingTrend[]));
          totalTrendsDetected += analysis.trends.length;
          state.trendsDetected += analysis.trends.length;
        }

        if (analysis.error) {
          allErrors.push(`${displayUrl}: ${analysis.error}`);
          state.errors.push(`${displayUrl}: ${analysis.error}`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        const errorMsg = `${displayUrl}: ${msg}`;
        allErrors.push(errorMsg);
        state.errors.push(errorMsg);
      }

      state.urlsCompleted++;
    }

    // 4. Finalize job — store pending trends in DB for curation
    const finalState = researchProgress.get(jobId);
    if (finalState?.cancelled) {
      await prisma.trendResearchJob.update({
        where: { id: jobId },
        data: { status: 'CANCELLED', completedAt: new Date() },
      });
    } else {
      await prisma.trendResearchJob.update({
        where: { id: jobId },
        data: {
          status: allErrors.length > 0 && totalTrendsDetected === 0 ? 'FAILED' : 'COMPLETED',
          urlsCompleted: generatedUrls.length,
          trendsDetected: totalTrendsDetected,
          pendingTrends: JSON.parse(JSON.stringify(finalState?.pendingTrends ?? [])),
          errors: allErrors,
          completedAt: new Date(),
        },
      });

      if (finalState) {
        finalState.phase = 'complete';
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    allErrors.push(msg);

    await prisma.trendResearchJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errors: allErrors,
        completedAt: new Date(),
      },
    });

    const state = researchProgress.get(jobId);
    if (state) {
      state.phase = 'failed';
      state.errors.push(msg);
    }
  }

  // Cleanup in-memory state after 5 minutes (jobs can take 3+ min for 8 URLs)
  setTimeout(() => researchProgress.delete(jobId), 300_000);
}
