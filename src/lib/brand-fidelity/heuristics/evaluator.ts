// ============================================================
// Heuristic evaluator — Δ-2 sub-cluster C
//
// Pijler 3 evaluator die de actieve locale-pakket consumeert + content scant
// op corporate-fluff / superlatives / fillers / vague-quality / risky-
// comparatives. Output shape compatible met `RuleViolation` zodat composition-
// engine de heuristics-violations + BrandRule-violations naadloos kan mergen.
//
// Drie-laagse flagging per HeuristicSeverity:
//   - always-flag: word-boundary regex match → warning
//   - context-flag: word-boundary match + substantiation/comparand-check
//     in zelfde paragraaf → warning when check fails, ignored when satisfied
//   - soft-flag: word-boundary match → info
//
// Word-boundary regex hergebruikt het pattern uit style-scorer (case-insensitive,
// \b ASCII boundaries werken voor NL/BE/EN/DE).
// ============================================================

import type { RuleViolation } from '../rule-compiler';
import type { BrandRuleType } from '@prisma/client';
import { getHeuristicsForBrand } from './index';
import type { HeuristicEntry, HeuristicSeverity } from './types';

// ─── Public API ─────────────────────────────────────

export interface HeuristicEvaluationResult {
  violations: RuleViolation[];
  /** Counts per HeuristicSeverity (separate from BrandRule severity-counts). */
  byHeuristicSeverity: Record<HeuristicSeverity, number>;
  /** Number of heuristic-entries evaluated (sum across alle categorieën). */
  entriesEvaluated: number;
}

/**
 * Evaluate content tegen het locale-resolved heuristic-package.
 * Returns empty result wanneer geen package voor de locale (graceful fallback).
 *
 * Performance: regex compilation per call. Acceptable voor F-VAL latency-budget
 * (Pijler 3 is sub-millisecond budget; ~120 entries × O(n) text-scan blijft <10ms
 * voor typical 500-1500 word content).
 */
export async function evaluateHeuristics(
  workspaceId: string,
  text: string,
): Promise<HeuristicEvaluationResult> {
  const pkg = await getHeuristicsForBrand(workspaceId);
  if (!pkg) {
    return {
      violations: [],
      byHeuristicSeverity: { 'always-flag': 0, 'context-flag': 0, 'soft-flag': 0 },
      entriesEvaluated: 0,
    };
  }

  const violations: RuleViolation[] = [];
  const counts: Record<HeuristicSeverity, number> = {
    'always-flag': 0,
    'context-flag': 0,
    'soft-flag': 0,
  };
  let entriesEvaluated = 0;

  for (const [category, entries] of Object.entries(pkg.categories)) {
    if (!entries) continue;
    for (const entry of entries) {
      entriesEvaluated++;
      const matches = findMatches(text, entry.term);
      if (matches.length === 0) continue;

      // Substantiation / comparand check voor context-flag entries
      if (entry.severity === 'context-flag' && entry.contextFlag) {
        const filtered = matches.filter((match) =>
          shouldFlagInContext(text, match.position, entry.contextFlag!),
        );
        if (filtered.length === 0) continue;
        for (const m of filtered) {
          violations.push(toViolation(entry, category, m, pkg.locale));
          counts[entry.severity]++;
        }
      } else {
        for (const m of matches) {
          violations.push(toViolation(entry, category, m, pkg.locale));
          counts[entry.severity]++;
        }
      }
    }
  }

  return { violations, byHeuristicSeverity: counts, entriesEvaluated };
}

// ─── Internals ──────────────────────────────────────

interface Match {
  snippet: string;
  position: number;
}

/**
 * Word-boundary case-insensitive matching. Returns alle non-overlapping matches.
 * Uses \b ASCII boundaries — adequate voor NL/BE/EN/DE tekst.
 */
function findMatches(text: string, term: string): Match[] {
  const trimmed = term.trim();
  if (!trimmed) return [];
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
  const out: Match[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    out.push({ snippet: m[0], position: m.index });
    if (m.index === regex.lastIndex) regex.lastIndex++; // safety voor zero-width
  }
  return out;
}

/**
 * Context-flag substantiation/comparand check. Examines de paragraaf rond
 * `position` (~80 chars before/after) voor evidence-anker:
 *
 *   - `requires-substantiation`: cijfer (digit) OF proper-noun-pattern
 *   - `requires-comparand`: "dan <X>" OR cijfer (numeric anchor)
 *
 * Returns true als context-flag should fire (i.e. substantiatie ontbreekt).
 */
function shouldFlagInContext(text: string, position: number, contextFlag: string): boolean {
  const radius = 80;
  const start = Math.max(0, position - radius);
  const end = Math.min(text.length, position + radius);
  const window = text.slice(start, end);

  if (contextFlag === 'requires-substantiation') {
    // OK wanneer cijfer in window — substantiatie aanwezig
    if (/\d/.test(window)) return false;
    // OK wanneer proper-noun-pattern (capitalized word ≥4 chars, not at sentence-start)
    if (/[a-z]\s+[A-Z][a-z]{3,}/.test(window)) return false;
    return true; // flag — geen substantiatie
  }

  if (contextFlag === 'requires-comparand') {
    // OK wanneer "dan <X>" patroon
    if (/\bdan\s+\S+/i.test(window)) return false;
    // OK wanneer cijfer (numeric anchor)
    if (/\d/.test(window)) return false;
    // OK wanneer "vs" / "versus" / "tegen"
    if (/\b(vs\.?|versus|tegen)\s+\S+/i.test(window)) return false;
    return true; // flag — geen comparand
  }

  // Onbekend contextFlag → conservatief: flag
  return true;
}

/** Map HeuristicSeverity → RuleViolation severity ('error'|'warning'|'info'). */
const SEVERITY_MAP: Record<HeuristicSeverity, RuleViolation['severity']> = {
  'always-flag': 'warning',
  'context-flag': 'warning',
  'soft-flag': 'info',
};

function toViolation(
  entry: HeuristicEntry,
  category: string,
  match: Match,
  locale: string,
): RuleViolation {
  return {
    // Synthetic ruleId — combineert locale + category + term zodat finding
    // herleidbaar is naar het bron-package (vs. een echte BrandRule row).
    ruleId: `heuristic:${locale}:${category}:${entry.term}`,
    // Hergebruik FORBIDDEN_WORD ruleType — dichtsbijzijnde semantic match.
    // Composition-engine kan via ruleId-prefix onderscheiden tussen heuristic
    // en BrandRule violations.
    ruleType: 'FORBIDDEN_WORD' as BrandRuleType,
    pattern: entry.term,
    severity: SEVERITY_MAP[entry.severity],
    message: entry.annotation
      ? `${entry.term}: ${entry.annotation}`
      : `Heuristic flag (${category}): ${entry.term}`,
    snippet: match.snippet,
    position: match.position,
  };
}
