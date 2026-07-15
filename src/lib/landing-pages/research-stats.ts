// =============================================================
// GEO long-form — research-backed citeableStats (Exa + S2).
//
// Fetches a small package of real, sourced statistics for the article topic
// so the generation model can cite genuine current numbers instead of
// inventing sources (the recurring GEO stat-leak class, gotcha 2026-06-24).
// Fully fail-soft + key-gated: no keys / any error → empty package → the
// generation prompt is byte-identical to today.
//
// Deterministic extraction (no extra LLM call): each candidate's `value` is
// a number literally present in the source snippet/abstract, and its `source`
// must survive `cleanStatSource` (the same filter that scrubs invented /
// internal-layer sources), so nothing here can smuggle a fake source through.
// =============================================================

import { searchExaSources } from "@/lib/exa/exa-client";
import { searchScholarSources } from "@/lib/semantic-scholar/scholar-client";
import { cleanStatSource } from "./sanitize-geo-sources";

export interface ResearchStatCandidate {
  /** Short descriptor of what the number is (the source sentence, trimmed). */
  label: string;
  /** The figure, literally lifted from the source text. */
  value: string;
  /** Citeable source label — survives cleanStatSource. */
  source: string;
  /** For the prompt context; the public schema has no url field. */
  sourceUrl?: string;
  origin: "exa" | "scholar";
}

const MAX_CANDIDATES = 6;
// Stats stay citeable longer than trend signals — a ~3-year window keeps
// authoritative figures without going stale.
const EXA_FRESHNESS_DAYS = 1095;
const EXA_RESULTS = 8;

// A figure worth citing: percentage, currency amount, magnitude number
// (miljard/million/x), or a grouped large number (1.234 / 12,000).
const STAT_RE =
  /(?:[€$£]\s?\d[\d.,]*|\d{1,3}(?:[.,]\d+)?\s?%|\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s?(?:%|procent|percent|keer|x|miljard|miljoen|billion|million|bn)\b)/i;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * First stat-like figure in `text` plus a ~160-char window centered on it, so
 * the descriptor always contains the value (no truncation can drop it).
 */
export function extractStat(text: string): { value: string; sentence: string } | null {
  const match = STAT_RE.exec(text);
  if (!match) return null;
  const value = match[0].trim();
  // Anchor on the actual match position (not the first indexOf, which could be
  // an earlier coincidental occurrence), compensating for trimmed whitespace.
  const idx = match.index + match[0].indexOf(value);
  const start = Math.max(0, idx - 70);
  const end = Math.min(text.length, idx + value.length + 90);
  const sentence = text.slice(start, end).trim().replace(/\s+/g, " ");
  return { value, sentence };
}

/**
 * Fetch a small package of real, sourced stat-candidates for `topic`.
 * Exa (recent web) + Semantic Scholar (peer-reviewed), fail-soft, deduped by
 * value, each with a source that survives `cleanStatSource`.
 */
export async function fetchResearchStatCandidates(
  topic: string,
  opts?: { max?: number },
): Promise<ResearchStatCandidate[]> {
  const cleanTopic = topic.trim().slice(0, 95);
  if (cleanTopic.length < 4) return [];

  // Both layers fail-soft to [] and run in parallel — this sits on the critical
  // path before the (expensive) generation, so no serial Exa→S2 waiting.
  const fetchExa = async (): Promise<ResearchStatCandidate[]> => {
    if (!process.env.EXA_API_KEY) return [];
    try {
      const blocks = await searchExaSources(
        [{ query: `${cleanTopic} statistics data`, queryLayer: "trend" }],
        { startPublishedDate: isoDaysAgo(EXA_FRESHNESS_DAYS), numResults: EXA_RESULTS, maxResults: EXA_RESULTS },
      );
      return blocks.flatMap((b) => {
        const stat = extractStat(b.snippet);
        const source = stat && cleanStatSource(b.title || domainOf(b.url));
        return stat && source
          ? [{ label: stat.sentence, value: stat.value, source, sourceUrl: b.url, origin: "exa" as const }]
          : [];
      });
    } catch {
      return [];
    }
  };

  const fetchScholar = async (): Promise<ResearchStatCandidate[]> => {
    if (!process.env.S2_API_KEY) return [];
    try {
      const papers = await searchScholarSources([{ query: cleanTopic, queryLayer: "effectiveness" }]);
      return papers.flatMap((p) => {
        const stat = extractStat(p.abstract);
        const source = stat && cleanStatSource(`${p.title}${p.year > 0 ? ` (${p.year})` : ""}`);
        return stat && source
          ? [{ label: stat.sentence, value: stat.value, source, sourceUrl: p.url, origin: "scholar" as const }]
          : [];
      });
    } catch {
      return [];
    }
  };

  const [exaCandidates, scholarCandidates] = await Promise.all([fetchExa(), fetchScholar()]);

  // Dedup by value (Exa first, then Scholar) and cap.
  const candidates: ResearchStatCandidate[] = [];
  const seenValues = new Set<string>();
  for (const c of [...exaCandidates, ...scholarCandidates]) {
    const key = c.value.toLowerCase();
    if (seenValues.has(key)) continue;
    seenValues.add(key);
    candidates.push(c);
  }

  return candidates.slice(0, opts?.max ?? MAX_CANDIDATES);
}

/**
 * Render the candidate package as a clearly-labeled prompt block. Empty string
 * when there are no candidates — so appending it leaves the prompt unchanged.
 * The block heading is referenced by the GEO system prompt's citeableStats rule.
 */
export function buildResearchStatsBlock(candidates: ResearchStatCandidate[]): string {
  if (candidates.length === 0) return "";
  const lines = candidates.map((c) => `- ${c.value} — ${c.label} (bron: ${c.source})`);
  return [
    "## GEVERIFIEERD BRONMATERIAAL",
    'Actuele, gedateerde cijfers uit externe bronnen (Exa web-search + Semantic Scholar). Gebruik deze bij VOORKEUR voor citeableStats: kopieer de waarde letterlijk en zet de bijbehorende bron EXACT in citeableStats[].source. Verzin geen bronnen buiten deze en de "## CITEERBARE BRONNEN"-lijst.',
    lines.join("\n"),
    "",
  ].join("\n");
}
