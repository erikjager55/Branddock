// =============================================================
// Trend Researcher — 5-Phase AI Research Pipeline
//
// Phase 1: DISCOVER  — Generate diverse queries, search for URLs
// Phase 2: EXTRACT   — Scrape URLs, extract structured signals
// Phase 3: SYNTHESIZE — Cross-reference signals into trends
// Phase 4: EVALUATE  — Score trends on 5 dimensions
// Phase 5: VALIDATE  — LLM-as-Judge quality control
//
// Fire-and-forget with in-memory progress tracking.
// =============================================================

import { prisma } from '@/lib/prisma';
import { scrapeProductUrl } from '@/lib/products/url-scraper';
import { searchWithGrounding } from '@/lib/ai/gemini-client';
import { getBrandContext } from '@/lib/ai/brand-context';
import { generateDiverseQueries } from './query-generator';
import { extractSignalsFromSources, type Signal } from './signal-extractor';
import { synthesizeTrends, type SanitizedTrend } from './trend-analyzer';
import { calculatePartialScores, filterByQuality, QUALITY_THRESHOLD, type TrendScores } from './trend-scorer';
import { judgeTrends } from './trend-judge';

// ─── In-memory progress tracking ──────────────────────────────

export type ResearchPhase =
  | 'generating_queries'
  | 'discovering_sources'
  | 'extracting_signals'
  | 'synthesizing'
  | 'validating'
  | 'complete'
  | 'failed'
  | 'cancelled';

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
  // Extended fields
  dataPoints: string[];
  evidenceCount: number;
  sourceUrls: string[];
  whyNow: string | null;
  scores?: TrendScores;
}

interface ResearchProgress {
  phase: ResearchPhase;
  // Phase 1: discovery
  queriesGenerated: number;
  urlsTotal: number;
  urlsCompleted: number;
  currentUrl: string | null;
  // Phase 2: extraction
  signalsExtracted: number;
  sourcesProcessed: number;
  sourcesTotal: number;
  // Phase 3-5: synthesis + scoring + validation
  trendsDetected: number;
  trendsRejected: number;
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

// ─── Configuration ──────────────────────────────────────────

const MAX_URLS_PER_QUERY = 4;
const MAX_TOTAL_URLS = 20;
const MAX_DOMAIN_DUPLICATES = 2;
const MAX_TRENDS_TOTAL = 8;

// ─── Main Pipeline ──────────────────────────────────────────

/**
 * Run a trend research job using the 5-phase pipeline.
 *
 * Phase 1: DISCOVER  — Generate 5-7 diverse queries, find 15-25 URLs
 * Phase 2: EXTRACT   — Scrape all URLs, extract structured signals
 * Phase 3: SYNTHESIZE — Cross-reference signals into candidate trends
 * Phase 4: EVALUATE  — Score trends on evidence + actionability
 * Phase 5: VALIDATE  — Judge loop for novelty + relevance + growth
 */
export async function runTrendResearch(
  jobId: string,
  workspaceId: string,
  query: string,
  useBrandContext: boolean,
) {
  // Initialize progress
  researchProgress.set(jobId, {
    phase: 'generating_queries',
    queriesGenerated: 0,
    urlsTotal: 0,
    urlsCompleted: 0,
    currentUrl: null,
    signalsExtracted: 0,
    sourcesProcessed: 0,
    sourcesTotal: 0,
    trendsDetected: 0,
    trendsRejected: 0,
    pendingTrends: [],
    errors: [],
    cancelled: false,
  });

  await prisma.trendResearchJob.update({
    where: { id: jobId },
    data: { status: 'RUNNING' },
  });

  const allErrors: string[] = [];

  try {
    const state = researchProgress.get(jobId)!;

    // Get brand context if requested
    const brandContext = useBrandContext ? await getBrandContext(workspaceId) : undefined;

    // ════════════════════════════════════════════════════════
    // PHASE 1: DISCOVER — Diverse queries + URL collection
    // ════════════════════════════════════════════════════════

    state.phase = 'generating_queries';

    // Generate diverse search queries
    const searchQuery = brandContext
      ? `${query} (industry: ${brandContext.brandName ?? ''} ${brandContext.productsOverview ?? ''})`
      : query;

    const diverseQueries = await generateDiverseQueries(searchQuery, brandContext);
    state.queriesGenerated = diverseQueries.length;

    if (state.cancelled) return await finalizeCancelled(jobId);

    // Search for URLs per query — also capture Gemini's search response text
    state.phase = 'discovering_sources';

    const allUrls: Array<{ url: string; title: string; query: string }> = [];
    const seenDomains = new Map<string, number>(); // domain → count
    const searchResponseTexts: Array<{ query: string; text: string }> = [];

    for (const q of diverseQueries) {
      if (state.cancelled) break;
      state.currentUrl = `Searching: ${q.slice(0, 60)}...`;

      try {
        const searchResult = await searchWithGrounding(q, MAX_URLS_PER_QUERY);

        // Capture the AI search response text (contains grounded summaries)
        if (searchResult.responseText.length > 50) {
          searchResponseTexts.push({ query: q, text: searchResult.responseText });
        }

        for (const r of searchResult.urls) {
          // Domain dedup: max N per domain
          let domain = 'unknown';
          try {
            domain = new URL(r.url).hostname.replace(/^www\./, '');
          } catch { /* keep unknown */ }

          const domainCount = seenDomains.get(domain) ?? 0;
          if (domainCount >= MAX_DOMAIN_DUPLICATES) continue;
          if (allUrls.some((u) => u.url === r.url)) continue;

          seenDomains.set(domain, domainCount + 1);
          allUrls.push({ url: r.url, title: r.title, query: q });

          if (allUrls.length >= MAX_TOTAL_URLS) break;
        }
      } catch (error) {
        const msg = `Search failed for "${q.slice(0, 40)}": ${error instanceof Error ? error.message : 'Unknown'}`;
        allErrors.push(msg);
        state.errors.push(msg);
      }

      if (allUrls.length >= MAX_TOTAL_URLS) break;
    }

    if (allUrls.length === 0 && searchResponseTexts.length === 0) {
      throw new Error('No URLs found across all search queries');
    }

    state.urlsTotal = allUrls.length;

    // Update job with discovered URLs
    await prisma.trendResearchJob.update({
      where: { id: jobId },
      data: {
        urlsGenerated: allUrls.map((u) => u.url),
        urlsTotal: allUrls.length,
      },
    });

    if (state.cancelled) return await finalizeCancelled(jobId);

    // ════════════════════════════════════════════════════════
    // PHASE 2: EXTRACT — Scrape + structured signal extraction
    // ════════════════════════════════════════════════════════

    state.phase = 'extracting_signals';
    state.currentUrl = 'Scraping sources...';

    // Scrape all URLs
    const scrapedSources: Array<{ name: string; url: string; content: string }> = [];

    for (const urlEntry of allUrls) {
      if (state.cancelled) break;

      const displayUrl = urlEntry.title || urlEntry.url.replace(/^https:\/\/[^/]+\//, '').slice(0, 60);
      state.currentUrl = displayUrl;

      try {
        const scraped = await scrapeProductUrl(urlEntry.url);

        if (!scraped.bodyText || scraped.bodyText.trim().length < 100) {
          const skipMsg = `${displayUrl}: Insufficient content`;
          allErrors.push(skipMsg);
          state.errors.push(skipMsg);
          state.urlsCompleted++;
          continue;
        }

        scrapedSources.push({
          name: urlEntry.title || urlEntry.url,
          url: urlEntry.url,
          content: scraped.bodyText,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        const errorMsg = `${displayUrl}: ${msg}`;
        allErrors.push(errorMsg);
        state.errors.push(errorMsg);
      }

      state.urlsCompleted++;

      // Sync progress to DB periodically
      if (state.urlsCompleted % 5 === 0 || state.urlsCompleted === allUrls.length) {
        await prisma.trendResearchJob.update({
          where: { id: jobId },
          data: { urlsCompleted: state.urlsCompleted },
        }).catch(() => {});
      }
    }

    if (state.cancelled) return await finalizeCancelled(jobId);

    // Add Gemini search response texts as grounded sources
    // These are AI-summarized search results and are always available,
    // even when URL scraping fails (JS-heavy sites, 403s, etc.)
    for (const sr of searchResponseTexts) {
      scrapedSources.push({
        name: `Google Search: ${sr.query.slice(0, 60)}`,
        url: `search:${sr.query.slice(0, 100)}`,
        content: sr.text,
      });
    }

    if (scrapedSources.length === 0) {
      throw new Error('No sources could be scraped successfully');
    }

    // Extract structured signals from all sources in parallel
    state.sourcesTotal = scrapedSources.length;
    state.currentUrl = `Extracting data from ${scrapedSources.length} sources...`;

    const signals = await extractSignalsFromSources(
      scrapedSources,
      (completed, total) => {
        state.sourcesProcessed = completed;
        state.signalsExtracted = 0; // will be set after
      },
    );

    state.signalsExtracted = signals.length;

    if (signals.length === 0) {
      // No structured signals extracted — create fallback signals from raw scraped content.
      // Use more content per source so synthesis has enough material to work with.
      const fallbackSignals: Signal[] = scrapedSources.slice(0, 8).map((src) => ({
        claim: src.content.slice(0, 2000),
        evidence: src.content.slice(0, 3000),
        dataPoints: [],
        entities: [],
        sourceUrl: src.url,
        sourceName: src.name,
        sourceType: 'other' as const,
        publicationDate: null,
        sourceAuthority: 'unknown' as const,
      }));

      if (fallbackSignals.length === 0) {
        throw new Error('No signals could be extracted from any source');
      }

      signals.push(...fallbackSignals);
      const fallbackMsg = `Signal extraction returned 0 results, using ${fallbackSignals.length} raw content fallbacks`;
      allErrors.push(fallbackMsg);
      state.errors.push(fallbackMsg);
      state.signalsExtracted = signals.length;
    }

    if (state.cancelled) return await finalizeCancelled(jobId);

    // ════════════════════════════════════════════════════════
    // PHASE 3: SYNTHESIZE — Cross-reference signals into trends
    // ════════════════════════════════════════════════════════

    state.phase = 'synthesizing';
    state.currentUrl = `Cross-referencing ${signals.length} signals...`;

    const synthesis = await synthesizeTrends({
      query,
      signals,
      sourceCount: scrapedSources.length,
      workspaceId,
      researchJobId: jobId,
      brandContext,
      maxTrends: MAX_TRENDS_TOTAL,
    });

    if (synthesis.error) {
      allErrors.push(synthesis.error);
      state.errors.push(synthesis.error);
    }

    if (synthesis.trends.length === 0) {
      throw new Error('No trends could be synthesized from the extracted signals');
    }

    if (state.cancelled) return await finalizeCancelled(jobId);

    // ════════════════════════════════════════════════════════
    // PHASE 5: VALIDATE — LLM-as-Judge
    // ════════════════════════════════════════════════════════

    state.phase = 'validating';
    state.currentUrl = 'Validating trend quality...';

    const judgeResult = await judgeTrends(synthesis.trends, brandContext);

    if (judgeResult.error) {
      allErrors.push(`Judge: ${judgeResult.error}`);
      state.errors.push(`Judge: ${judgeResult.error}`);
    }

    state.trendsRejected = judgeResult.rejected.length;

    // If judge rejected ALL trends, override: keep all with fallback scores
    // The judge should not be a hard gate that kills the entire pipeline
    if (judgeResult.approved.length === 0 && synthesis.trends.length > 0) {
      const rescued = synthesis.trends.map((t) => ({
        ...t,
        scores: calculatePartialScores(t, signals),
      }));
      judgeResult.approved.push(...rescued);
      const msg = `Judge rejected all ${synthesis.trends.length} trends, rescued with fallback scores`;
      allErrors.push(msg);
      state.errors.push(msg);
      state.trendsRejected = 0;
    }

    // Filter by quality threshold
    const qualityFiltered = filterByQuality(judgeResult.approved);

    // If quality filter removes everything, fall back to top trends by score
    const finalTrends = qualityFiltered.length > 0
      ? qualityFiltered
      : judgeResult.approved
          .sort((a, b) => b.scores.compositeScore - a.scores.compositeScore)
          .slice(0, Math.min(3, judgeResult.approved.length));

    if (qualityFiltered.length === 0 && judgeResult.approved.length > 0) {
      const msg = `Quality filter: ${judgeResult.approved.length} trends evaluated, ${qualityFiltered.length} passed threshold (${QUALITY_THRESHOLD}), using ${finalTrends.length} best`;
      allErrors.push(msg);
      state.errors.push(msg);
    }

    // Convert to PendingTrend format — filter out search: pseudo-URLs
    const pendingTrends: PendingTrend[] = finalTrends.map((t) => {
      const realSourceUrls = t.sourceUrls.filter((u) => !u.startsWith('search:'));
      const realSourceUrl = t.sourceUrl.startsWith('search:')
        ? realSourceUrls[0] ?? null
        : t.sourceUrl;

      return {
        title: t.title,
        slug: t.slug,
        description: t.description,
        category: t.category,
        scope: t.scope,
        impactLevel: t.impactLevel,
        timeframe: t.timeframe,
        relevanceScore: t.relevanceScore,
        direction: t.direction,
        confidence: t.confidence,
        rawExcerpt: t.rawExcerpt,
        aiAnalysis: t.aiAnalysis,
        industries: t.industries,
        tags: t.tags,
        howToUse: t.howToUse,
        sourceUrl: realSourceUrl ?? '',
        detectionSource: t.detectionSource,
        researchJobId: t.researchJobId,
        workspaceId: t.workspaceId,
        dataPoints: t.dataPoints,
        evidenceCount: t.evidenceCount,
        sourceUrls: realSourceUrls,
        whyNow: t.whyNow,
        scores: t.scores,
      };
    });

    state.pendingTrends = pendingTrends;
    state.trendsDetected = pendingTrends.length;

    // ════════════════════════════════════════════════════════
    // FINALIZE
    // ════════════════════════════════════════════════════════

    await prisma.trendResearchJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        urlsCompleted: allUrls.length,
        trendsDetected: state.trendsDetected,
        pendingTrends: JSON.parse(JSON.stringify(pendingTrends)),
        errors: allErrors,
        completedAt: new Date(),
      },
    });

    state.phase = 'complete';
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

  // Cleanup in-memory state after 5 minutes
  setTimeout(() => researchProgress.delete(jobId), 300_000);
}

async function finalizeCancelled(jobId: string): Promise<void> {
  await prisma.trendResearchJob.update({
    where: { id: jobId },
    data: { status: 'CANCELLED', completedAt: new Date() },
  });
}
