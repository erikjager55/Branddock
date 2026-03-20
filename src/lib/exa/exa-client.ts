// =============================================================================
// Exa API Client — Cross-industry context enrichment for strategy generation
// Fetches neural search results for analogies, cultural tensions, and trends
// =============================================================================

import type { ExaQuery } from './exa-queries';

// ─── Types ──────────────────────────────────────────────

/** A single search result block extracted from Exa */
export interface ExaBlock {
  /** The page title */
  title: string;
  /** The source URL */
  url: string;
  /** Text snippet from the page */
  snippet: string;
  /** Which query layer produced this block */
  queryLayer: 'analogy' | 'cultural' | 'trend';
}

/** Complete result from the Exa enrichment step */
export interface ExaEnrichmentResult {
  /** Formatted context string for the prompt (empty string if no results) */
  contextText: string;
  /** Tracking metadata (null if enrichment was skipped/failed) */
  meta: { totalResults: number; queries: string[] } | null;
}

/** Raw Exa search API response (partial — only fields we use) */
interface ExaSearchResponse {
  results?: Array<{
    title?: string;
    url?: string;
    text?: string;
  }>;
}

// ─── Constants ──────────────────────────────────────────

const EXA_BASE_URL = 'https://api.exa.ai';
const FETCH_TIMEOUT_MS = 8000;
const MAX_TOTAL_RESULTS = 15;

// ─── Fetch Helpers ──────────────────────────────────────

let warnedNoKey = false;

function getApiKey(): string | null {
  const key = process.env.EXA_API_KEY;
  if (key) return key;
  if (!warnedNoKey) {
    console.warn('[exa] EXA_API_KEY not set — Exa enrichment will be skipped');
    warnedNoKey = true;
  }
  return null;
}

/**
 * Search Exa for results matching a query using neural search.
 * Returns filtered results with title, URL, and text snippet.
 */
async function searchExa(
  query: string,
  queryLayer: ExaBlock['queryLayer'],
): Promise<ExaBlock[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${EXA_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        type: 'neural',
        numResults: 5,
        contents: {
          text: { maxCharacters: 500 },
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`[exa] Search failed for "${query}": ${res.status} ${res.statusText}`);
      return [];
    }

    const data = (await res.json()) as ExaSearchResponse;

    const blocks = (data.results ?? [])
      .filter(r => r.title && r.url && r.text)
      .map(r => ({
        title: r.title!.trim(),
        url: r.url!,
        snippet: truncate(r.text!.trim(), 400),
        queryLayer,
      }));

    console.info(`[exa] Query "${query}": ${blocks.length} results`);
    return blocks;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg.includes('abort')) {
      console.warn(`[exa] Search timed out for "${query}" after ${FETCH_TIMEOUT_MS}ms`);
    } else {
      console.warn(`[exa] Search error for "${query}": ${msg}`);
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Main Enrichment Function ───────────────────────────

/**
 * Fetch Exa context for strategy enrichment.
 * Runs queries in parallel via Promise.allSettled, deduplicates by URL,
 * and formats as prompt context markdown.
 * Never throws — returns empty result on any failure.
 */
export async function fetchExaContext(
  queries: ExaQuery[],
): Promise<ExaEnrichmentResult> {
  if (queries.length === 0) {
    console.info('[exa] No queries provided — skipping enrichment');
    return { contextText: '', meta: null };
  }

  console.info(`[exa] Queries: ${JSON.stringify(queries.map(q => q.query))}`);

  try {
    const results = await Promise.allSettled(
      queries.map(({ query, queryLayer }) => searchExa(query, queryLayer)),
    );

    const allBlocks: ExaBlock[] = [];
    const executedQueries: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      executedQueries.push(queries[i].query);

      if (result.status !== 'fulfilled') continue;
      for (const block of result.value) {
        allBlocks.push(block);
      }
    }

    // Deduplicate by URL (case-insensitive)
    const seen = new Set<string>();
    const dedupedBlocks = allBlocks.filter(block => {
      const key = block.url.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const finalBlocks = dedupedBlocks.slice(0, MAX_TOTAL_RESULTS);

    if (finalBlocks.length === 0) {
      console.info('[exa] Enrichment complete: 0 results found');
      return { contextText: '', meta: null };
    }

    const contextText = formatExaContext(finalBlocks);

    console.info(
      `[exa] Enrichment complete: ${finalBlocks.length} results, ${(contextText.length / 1024).toFixed(1)}KB context text`,
    );

    return {
      contextText,
      meta: {
        totalResults: finalBlocks.length,
        queries: executedQueries,
      },
    };
  } catch (error) {
    console.warn('[exa] Enrichment failed, proceeding without Exa context:', error);
    return { contextText: '', meta: null };
  }
}

// ─── Prompt Formatter ───────────────────────────────────

const LAYER_LABELS: Record<ExaBlock['queryLayer'], string> = {
  analogy: 'Cross-Industry Analogies',
  cultural: 'Cultural Tensions',
  trend: 'Trend-Driven Insights',
};

function formatExaContext(blocks: ExaBlock[]): string {
  const analogy = blocks.filter(b => b.queryLayer === 'analogy');
  const cultural = blocks.filter(b => b.queryLayer === 'cultural');
  const trend = blocks.filter(b => b.queryLayer === 'trend');

  const parts: string[] = [];

  if (analogy.length > 0) {
    parts.push(`### ${LAYER_LABELS.analogy}`);
    parts.push(analogy.map(b => formatBlock(b)).join('\n'));
  }

  if (cultural.length > 0) {
    parts.push(`### ${LAYER_LABELS.cultural}`);
    parts.push(cultural.map(b => formatBlock(b)).join('\n'));
  }

  if (trend.length > 0) {
    parts.push(`### ${LAYER_LABELS.trend}`);
    parts.push(trend.map(b => formatBlock(b)).join('\n'));
  }

  const sources = blocks
    .slice(0, 10)
    .map(b => extractDomain(b.url))
    .filter((v, i, a) => a.indexOf(v) === i);

  if (sources.length > 0) {
    parts.push(`\n_Sources: Exa neural search — ${sources.join(', ')}_`);
  }

  return parts.join('\n\n');
}

function formatBlock(block: ExaBlock): string {
  const source = extractDomain(block.url);
  return `- **${block.title}** (${source}): ${block.snippet}`;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '\u2026';
}
