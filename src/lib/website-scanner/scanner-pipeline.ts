// =============================================================
// Scanner Pipeline — Orchestrates the 5-phase website scan
//
// Fire-and-forget with in-memory progress tracking.
// Pattern from Trend Radar researcher.ts.
// =============================================================

import { prisma } from '@/lib/prisma';
import { crawlWebsite } from './crawler';
import { extractWebsiteData } from './content-extractor';
import { analyzeWebsiteData } from './ai-analyzer';
import { mapResultsToModels } from './data-mapper';
import { analyzeUrl } from '@/lib/brandstyle/analysis-engine';
import type { ScanProgress, MappedResults } from './types';

// ─── In-memory progress tracking ──────────────────────────────

const scanProgress = new Map<string, ScanProgress>();

/** Get in-memory progress for a scan job */
export function getScanProgress(jobId: string): ScanProgress | null {
  return scanProgress.get(jobId) ?? null;
}

/** Cancel a running scan */
export function cancelScan(jobId: string): boolean {
  const progress = scanProgress.get(jobId);
  if (progress && progress.status !== 'COMPLETED' && progress.status !== 'FAILED') {
    progress.cancelled = true;
    progress.status = 'CANCELLED';
    return true;
  }
  return false;
}

/** Calculate overall progress percentage */
function calculateProgress(progress: ScanProgress): number {
  switch (progress.status) {
    case 'CRAWLING': {
      const crawlPct = progress.pagesDiscovered > 0
        ? (progress.pagesCrawled / progress.pagesDiscovered) * 30
        : 5;
      return Math.min(crawlPct, 30);
    }
    case 'EXTRACTING':
      return 30 + 20; // 30-50%
    case 'ANALYZING': {
      const analyzePct = progress.categoriesTotal > 0
        ? (progress.categoriesDone / progress.categoriesTotal) * 35
        : 0;
      return 50 + analyzePct; // 50-85%
    }
    case 'MAPPING':
      return 85;
    case 'STYLING':
      return 92;
    case 'COMPLETED':
      return 100;
    default:
      return 0;
  }
}

const TOTAL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Start a website scan pipeline.
 * Fire-and-forget — returns immediately, updates progress in-memory.
 */
export async function startScanPipeline(
  scanId: string,
  url: string,
  workspaceId: string,
  userId: string,
): Promise<void> {
  const progress: ScanProgress = {
    id: scanId,
    status: 'CRAWLING',
    progress: 0,
    pagesDiscovered: 0,
    pagesCrawled: 0,
    currentPage: null,
    crawledPages: [],
    currentCategory: null,
    categoriesDone: 0,
    categoriesTotal: 4, // 4 parallel Claude calls
    results: null,
    errors: [],
    cancelled: false,
    brandstyleStatus: null,
    brandstyleError: null,
  };

  scanProgress.set(scanId, progress);
  const startTime = Date.now();

  try {
    // Update DB status
    await prisma.websiteScan.update({
      where: { id: scanId },
      data: { status: 'CRAWLING' },
    });

    // Phase 1: CRAWL
    progress.status = 'CRAWLING';
    progress.progress = calculateProgress(progress);

    const crawledPages = await crawlWebsite(url, progress);

    if (progress.cancelled) {
      await finalizeScan(scanId, progress, 'CANCELLED');
      return;
    }

    if (crawledPages.length === 0) {
      progress.errors.push('No pages could be crawled from the website');
      await finalizeScan(scanId, progress, 'FAILED');
      return;
    }

    // Save crawled pages to DB
    await prisma.websiteScan.update({
      where: { id: scanId },
      data: {
        status: 'EXTRACTING',
        pagesDiscovered: progress.pagesDiscovered,
        pagesCrawled: crawledPages.length,
        crawledPages: progress.crawledPages as unknown as import('@prisma/client').Prisma.InputJsonValue,
      },
    });

    // Check timeout
    if (Date.now() - startTime > TOTAL_TIMEOUT_MS) {
      progress.errors.push('Total scan timeout reached (5 minutes)');
      await finalizeScan(scanId, progress, 'FAILED');
      return;
    }

    // Phase 2: EXTRACT
    progress.status = 'EXTRACTING';
    progress.progress = calculateProgress(progress);

    let extraction;
    try {
      extraction = await extractWebsiteData(crawledPages);
    } catch {
      // Retry once
      try {
        extraction = await extractWebsiteData(crawledPages);
      } catch (retryErr) {
        progress.errors.push(`Extraction failed: ${retryErr instanceof Error ? retryErr.message : 'Unknown error'}`);
        await finalizeScan(scanId, progress, 'FAILED');
        return;
      }
    }

    if (progress.cancelled) {
      await finalizeScan(scanId, progress, 'CANCELLED');
      return;
    }

    // Save extraction to DB
    await prisma.websiteScan.update({
      where: { id: scanId },
      data: {
        status: 'ANALYZING',
        extractedData: extraction as unknown as import('@prisma/client').Prisma.InputJsonValue,
      },
    });

    // Check timeout
    if (Date.now() - startTime > TOTAL_TIMEOUT_MS) {
      progress.errors.push('Total scan timeout reached (5 minutes)');
      await finalizeScan(scanId, progress, 'FAILED');
      return;
    }

    // Phase 3: ANALYZE
    progress.status = 'ANALYZING';
    progress.progress = calculateProgress(progress);

    const analysisResults = await analyzeWebsiteData(extraction, progress);

    if (progress.cancelled) {
      await finalizeScan(scanId, progress, 'CANCELLED');
      return;
    }

    // Save AI results to DB
    await prisma.websiteScan.update({
      where: { id: scanId },
      data: {
        status: 'MAPPING',
        aiResults: analysisResults as unknown as import('@prisma/client').Prisma.InputJsonValue,
        categoriesDone: progress.categoriesDone,
      },
    });

    // Phase 4: MAP
    progress.status = 'MAPPING';
    progress.progress = calculateProgress(progress);

    const industry = extraction.companyProfile?.industry ?? undefined;
    const mappedResults = mapResultsToModels(analysisResults, url, industry);

    // Build confidence map
    const confidenceMap: Record<string, number> = {};
    for (const asset of mappedResults.brandAssets) {
      confidenceMap[`brand-asset:${asset.slug}`] = asset.confidence;
    }
    for (const persona of mappedResults.personas) {
      confidenceMap[`persona:${persona.name}`] = persona.confidence;
    }
    for (const product of mappedResults.products) {
      confidenceMap[`product:${product.name}`] = product.confidence;
    }
    for (const competitor of mappedResults.competitors) {
      confidenceMap[`competitor:${competitor.name}`] = competitor.confidence;
    }

    // Phase 5: STYLING (non-critical)
    progress.status = 'STYLING';
    progress.progress = calculateProgress(progress);
    progress.brandstyleStatus = 'Starting brand style analysis...';

    await prisma.websiteScan.update({
      where: { id: scanId },
      data: { status: 'STYLING' },
    });

    try {
      // Delete existing brandstyle data (atomic pattern)
      const existingStyleguide = await prisma.brandStyleguide.findUnique({ where: { workspaceId } });
      if (existingStyleguide) {
        await prisma.$transaction([
          prisma.styleguideColor.deleteMany({ where: { styleguideId: existingStyleguide.id } }),
          prisma.brandStyleguide.delete({ where: { id: existingStyleguide.id } }),
        ]);
      }

      progress.brandstyleStatus = 'Analyzing visual identity...';

      // Create new styleguide record
      const analysisJobId = `job_${crypto.randomUUID()}`;
      const styleguide = await prisma.brandStyleguide.create({
        data: {
          status: 'ANALYZING',
          sourceType: 'URL',
          sourceUrl: url,
          analysisStatus: 'SCANNING_STRUCTURE',
          analysisJobId,
          createdById: userId,
          workspaceId,
        },
      });

      // Await the analysis (NOT fire-and-forget)
      await analyzeUrl(styleguide.id, url);

      progress.brandstyleStatus = 'Brand style analysis complete';
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      progress.brandstyleError = errMsg;
      console.error('[scanner-pipeline] Brandstyle analysis failed (non-critical):', errMsg);
      // Non-critical: continue to COMPLETED
    }

    // Phase 6: COMPLETE
    progress.status = 'COMPLETED';
    progress.progress = 100;
    progress.results = mappedResults;

    await prisma.websiteScan.update({
      where: { id: scanId },
      data: {
        status: 'COMPLETED',
        aiResults: mappedResults as unknown as import('@prisma/client').Prisma.InputJsonValue,
        confidenceMap: confidenceMap as unknown as import('@prisma/client').Prisma.InputJsonValue,
        assetsPopulated: mappedResults.brandAssets.length + mappedResults.personas.length + mappedResults.products.length + mappedResults.competitors.length,
        completedAt: new Date(),
      },
    });

  } catch (err) {
    progress.errors.push(`Pipeline error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    await finalizeScan(scanId, progress, 'FAILED');
  }
}

async function finalizeScan(
  scanId: string,
  progress: ScanProgress,
  status: 'FAILED' | 'CANCELLED',
): Promise<void> {
  progress.status = status;
  try {
    await prisma.websiteScan.update({
      where: { id: scanId },
      data: {
        status,
        errors: progress.errors,
        completedAt: new Date(),
      },
    });
  } catch {
    // DB update failed — progress is still in-memory
  }
}

// Clean up old progress entries after 30 minutes
setInterval(() => {
  for (const [id, p] of scanProgress.entries()) {
    if (p.status === 'COMPLETED' || p.status === 'FAILED' || p.status === 'CANCELLED') {
      scanProgress.delete(id);
    }
  }
}, 5 * 60 * 1000);
