// =============================================================
// External source enrichment — Exa + Semantic Scholar as extra
// source layers for the trend-radar researcher.
//
// Follows the #402 pattern (knowledge-research/phases/search.ts):
// optional, fail-soft, key-gated. Each external result is mapped
// DIRECTLY to a `Signal` (no extra Gemini extraction) so origin,
// SourceType, and SourceAuthority are deterministic and cheap —
// the results then flow through the existing synthesis/scoring/
// judge pipeline unchanged.
// =============================================================

import { searchExaSources, type ExaBlock } from '@/lib/exa/exa-client';
import {
  searchScholarSources,
  type ScholarSourcePaper,
} from '@/lib/semantic-scholar/scholar-client';
import type { Signal } from './signal-extractor';

// How many diverse queries each layer consumes (mirrors #402: Exa 3, S2 2).
const EXA_QUERY_COUNT = 3;
const SCHOLAR_QUERY_COUNT = 2;
// Neural/academic search works best on short queries.
const MAX_QUERY_CHARS = 95;
// Freshness window for Exa — bias toward emerging discussions (~12 months).
const EXA_FRESHNESS_DAYS = 365;

export interface TrendEnrichmentResult {
  /** New signals from external layers, already deduped against existing URLs. */
  signals: Signal[];
  /** Non-fatal degradations (missing key, layer error) for the errors log. */
  warnings: string[];
  /** How many Exa-derived signals were added (post-dedup). */
  exaCount: number;
  /** How many Scholar-derived signals were added (post-dedup). */
  scholarCount: number;
}

/** Normalize a URL for cross-layer dedup: lowercase, trim, drop trailing slash. */
function normalizeUrl(url: string): string {
  return url.toLowerCase().trim().replace(/\/+$/, '');
}

/**
 * Map an Exa neural-search result to a `Signal`. Exa surfaces general web
 * content (articles, analyses, discussions) of variable authority, so we tag
 * it as an 'analysis' source with 'general' authority rather than guessing.
 */
export function mapExaBlockToSignal(block: ExaBlock): Signal {
  return {
    claim: (block.title || block.snippet).slice(0, 500),
    evidence: block.snippet.slice(0, 500),
    dataPoints: [],
    entities: [],
    sourceUrl: block.url,
    sourceName: block.title || block.url,
    sourceType: 'analysis',
    publicationDate: null,
    sourceAuthority: 'general',
  };
}

// Citation floor above which a peer-reviewed paper earns the 'industry_specialist'
// authority tier (a +10 bonus in trend-scorer). The S2 client already drops
// papers with ≤10 citations, so this gates the *authority weight*: a paper with
// only a handful of citations counts as a signal but not an authoritative one,
// which stops a marginal, low-traction paper from lifting a weak trend over the
// quality threshold. Well-cited papers keep their deserved weight.
const SCHOLAR_SPECIALIST_CITATION_FLOOR = 50;

/**
 * Map a Semantic Scholar paper to a `Signal`. Peer-reviewed research is tagged
 * 'research' (an early signal — science often precedes the market). Authority is
 * citation-tiered: only genuinely well-cited papers are treated as
 * 'industry_specialist'; lower-traction papers are 'general'.
 */
export function mapScholarPaperToSignal(paper: ScholarSourcePaper): Signal {
  return {
    claim: paper.title.slice(0, 500),
    evidence: (paper.abstract || paper.title).slice(0, 500),
    dataPoints: [],
    entities: [],
    sourceUrl: paper.url,
    sourceName: paper.title,
    sourceType: 'research',
    publicationDate: paper.year > 0 ? `${paper.year}-01-01` : null,
    sourceAuthority:
      paper.citationCount >= SCHOLAR_SPECIALIST_CITATION_FLOOR
        ? 'industry_specialist'
        : 'general',
  };
}

/** ISO date (YYYY-MM-DD) `days` before now, for Exa's freshness filter. */
function isoDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/**
 * Gather extra trend signals from Exa + Semantic Scholar.
 *
 * Both layers are optional and key-gated (`EXA_API_KEY` / `S2_API_KEY`) and
 * never block the scan: a missing key skips the layer silently, a thrown layer
 * error degrades to a warning, and per-query network errors (429/timeout) are
 * swallowed by the underlying client as partial/empty results (same fail-soft
 * posture as #402). Results are deduped by normalized source URL, both against
 * `existingUrls` (grounding-derived signals) and across the two layers.
 */
export async function gatherTrendEnrichmentSignals(params: {
  queries: string[];
  existingUrls: Iterable<string>;
}): Promise<TrendEnrichmentResult> {
  const warnings: string[] = [];
  const signals: Signal[] = [];
  let exaCount = 0;
  let scholarCount = 0;

  const seen = new Set<string>();
  for (const u of params.existingUrls) seen.add(normalizeUrl(u));

  const shortQueries = params.queries
    .map((q) => q.slice(0, MAX_QUERY_CHARS))
    .filter((q) => q.trim().length > 3);

  const addSignal = (signal: Signal): boolean => {
    const key = normalizeUrl(signal.sourceUrl);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    signals.push(signal);
    return true;
  };

  // ── Exa neural search (fresh web discussions) ──
  if (process.env.EXA_API_KEY) {
    try {
      const exaQueries = shortQueries
        .slice(0, EXA_QUERY_COUNT)
        .map((query) => ({ query, queryLayer: 'trend' as const }));
      const blocks = await searchExaSources(exaQueries, {
        startPublishedDate: isoDaysAgo(EXA_FRESHNESS_DAYS),
      });
      for (const block of blocks) {
        if (addSignal(mapExaBlockToSignal(block))) exaCount++;
      }
    } catch (error) {
      warnings.push(
        `Exa enrichment skipped: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  // ── Semantic Scholar (academic early signals) ──
  if (process.env.S2_API_KEY) {
    try {
      const scholarQueries = shortQueries
        .slice(0, SCHOLAR_QUERY_COUNT)
        .map((query) => ({ query, queryLayer: 'effectiveness' as const }));
      const papers = await searchScholarSources(scholarQueries);
      for (const paper of papers) {
        if (addSignal(mapScholarPaperToSignal(paper))) scholarCount++;
      }
    } catch (error) {
      warnings.push(
        `Scholar enrichment skipped: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  return { signals, warnings, exaCount, scholarCount };
}
