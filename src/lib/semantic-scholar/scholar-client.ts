// =============================================================================
// Semantic Scholar API Client — Research evidence enrichment for strategy generation
// Fetches academic papers on behavioral science and campaign effectiveness
// =============================================================================

import type { ScholarQuery } from './scholar-queries';

// ─── Types ──────────────────────────────────────────────

export interface ScholarPaper {
  title: string;
  abstract: string;
  citationCount: number;
  year: number;
  queryLayer: 'behavioral' | 'effectiveness';
}

export interface ScholarEnrichmentResult {
  /** Formatted context string for the prompt (empty string if no results) */
  contextText: string;
  /** Tracking metadata (null if enrichment was skipped/failed) */
  meta: { totalPapers: number; queries: string[] } | null;
}

/** Raw Semantic Scholar paper search response (partial — only fields we use) */
interface ScholarSearchResponse {
  total?: number;
  data?: Array<{
    paperId?: string;
    title?: string;
    abstract?: string | null;
    citationCount?: number;
    year?: number;
  }>;
}

// ─── Constants ──────────────────────────────────────────

const SCHOLAR_BASE_URL = 'https://api.semanticscholar.org/graph/v1';
const FETCH_TIMEOUT_MS = 8000;
const MAX_TOTAL_PAPERS = 8;
const MIN_CITATION_COUNT = 10;

// ─── Fetch Helpers ──────────────────────────────────────

let warnedNoKey = false;

function getAuthHeaders(): Record<string, string> {
  const key = process.env.S2_API_KEY;
  if (key) {
    return { 'x-api-key': key };
  }
  if (!warnedNoKey) {
    console.warn(
      '[scholar] S2_API_KEY not set — using unauthenticated access (100 req/5 min)',
    );
    warnedNoKey = true;
  }
  return {};
}

/**
 * Search Semantic Scholar for papers matching a query.
 * Returns filtered papers with title, abstract, citationCount, and year.
 */
async function searchPapers(
  query: string,
  limit: number = 5,
): Promise<Array<{ title: string; abstract: string; citationCount: number; year: number }>> {
  const url = `${SCHOLAR_BASE_URL}/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,abstract,citationCount,year`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: {
        ...getAuthHeaders(),
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(
        `[scholar] Search failed for "${query}": ${res.status} ${res.statusText}`,
      );
      return [];
    }

    const data = (await res.json()) as ScholarSearchResponse;

    const papers = (data.data ?? [])
      .filter((paper) => {
        if (!paper.title || !paper.abstract) return false;
        return true;
      })
      .map((paper) => ({
        title: paper.title!,
        abstract: paper.abstract!,
        citationCount: paper.citationCount ?? 0,
        year: paper.year ?? 0,
      }));

    console.info(
      `[scholar] Query "${query}": ${papers.length} papers found`,
    );
    return papers;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg.includes('abort')) {
      console.warn(
        `[scholar] Search timed out for "${query}" after ${FETCH_TIMEOUT_MS}ms`,
      );
    } else {
      console.warn(`[scholar] Search error for "${query}": ${msg}`);
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Main Enrichment Function ───────────────────────────

/**
 * Fetch Semantic Scholar context for strategy enrichment.
 * Runs queries in parallel via Promise.allSettled, deduplicates, filters,
 * sorts by citation count, and formats as prompt context.
 * Never throws — returns empty result on any failure.
 */
export async function fetchScholarContext(
  queries: ScholarQuery[],
): Promise<ScholarEnrichmentResult> {
  if (queries.length === 0) {
    console.info('[scholar] No queries provided — skipping enrichment');
    return { contextText: '', meta: null };
  }

  console.info(
    `[scholar] Queries: ${JSON.stringify(queries.map((q) => q.query))}`,
  );

  try {
    // Run all queries in parallel — failures don't block success
    const results = await Promise.allSettled(
      queries.map(async ({ query, queryLayer }) => {
        const papers = await searchPapers(query);
        return {
          queryLayer,
          query,
          papers: papers.map((p) => ({ ...p, queryLayer })),
        };
      }),
    );

    // Collect all papers
    const allPapers: ScholarPaper[] = [];
    const executedQueries: string[] = [];

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      const { query, papers } = result.value;

      executedQueries.push(query);

      for (const paper of papers) {
        allPapers.push(paper);
      }
    }

    // Filter: only papers with meaningful citations
    const significantPapers = allPapers.filter(
      (p) => p.citationCount > MIN_CITATION_COUNT,
    );

    // Deduplicate by title (case-insensitive, trimmed)
    const seen = new Set<string>();
    const dedupedPapers = significantPapers.filter((paper) => {
      const key = paper.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by citation count descending
    dedupedPapers.sort((a, b) => b.citationCount - a.citationCount);

    // Cap at MAX_TOTAL_PAPERS
    const finalPapers = dedupedPapers.slice(0, MAX_TOTAL_PAPERS);

    if (finalPapers.length === 0) {
      console.info('[scholar] Enrichment complete: 0 papers found');
      return { contextText: '', meta: null };
    }

    // Format as prompt context
    const contextText = formatScholarContext(finalPapers);

    console.info(
      `[scholar] Enrichment complete: ${finalPapers.length} papers (${(contextText.length / 1024).toFixed(1)}KB context text)`,
    );

    return {
      contextText,
      meta: {
        totalPapers: finalPapers.length,
        queries: executedQueries,
      },
    };
  } catch (error) {
    console.warn(
      '[scholar] Enrichment failed, proceeding without Semantic Scholar context:',
      error,
    );
    return { contextText: '', meta: null };
  }
}

// ─── Prompt Formatter ───────────────────────────────────

/**
 * Format Semantic Scholar papers as a markdown section for the strategy prompt.
 * Groups by query layer with citation metadata.
 */
function formatScholarContext(papers: ScholarPaper[]): string {
  const behavioral = papers.filter((p) => p.queryLayer === 'behavioral');
  const effectiveness = papers.filter((p) => p.queryLayer === 'effectiveness');

  const parts: string[] = [];

  if (behavioral.length > 0) {
    parts.push('### Behavioral Science Evidence');
    parts.push(
      behavioral
        .map((p) => `- **${p.title}** (${p.year}, ${p.citationCount} citations): ${truncate(p.abstract, 200)}`)
        .join('\n'),
    );
  }

  if (effectiveness.length > 0) {
    parts.push('### Campaign Effectiveness Research');
    parts.push(
      effectiveness
        .map((p) => `- **${p.title}** (${p.year}, ${p.citationCount} citations): ${truncate(p.abstract, 200)}`)
        .join('\n'),
    );
  }

  return parts.join('\n\n');
}

/** Truncate text to a maximum length, adding ellipsis if needed */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '...';
}
