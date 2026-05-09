// ============================================================
// Heuristic-package types — Δ-2 foundation
//
// Per ADR-3 hard-switch principle: HeuristicPackage is een bevroren bundle
// die als geheel door F-VAL Pijler 3 wordt geconsumeerd. nl-BE wordt
// programmatisch uit nl-NL gebouwd (whitelist + extra flags) maar
// exporteert als één bevroren unit — geen union/merge bij read-time.
// ============================================================

import type { Locale } from './locale-resolver';

// ─── Severity ────────────────────────────────────────

/**
 * Drie-laagse flagging per methodology-research:
 *
 * - `always-flag`: superlatieven zonder bewijs, AI-tells als "delve" /
 *   "tapestry", riskante comparatieven zonder anker. Trigger flag onafhankelijk
 *   van context.
 * - `context-flag`: vage-kwaliteitsclaims OK wanneer concrete substantiatie in
 *   zelfde paragraaf (cijfer, naam, specifiek-substantief). Pijler 3 evaluator
 *   doet substantiation-check vóór flagging.
 * - `soft-flag`: vulwoorden, single-pass review-suggestion. Geen blocking
 *   gate; bevindingen-tabel toont LOW severity.
 */
export type HeuristicSeverity = 'always-flag' | 'context-flag' | 'soft-flag';

// ─── Categories (mapped naar BrandReviewFinding.category per ADR-1) ──

export type HeuristicCategory =
  | 'corporate-fluff'
  | 'superlatives'
  | 'fillers'
  | 'vague-quality'
  | 'risky-comparatives'
  | 'ai-tells'; // EN-only initieel

// ─── Entry ──────────────────────────────────────────

export interface HeuristicEntry {
  /** De term zelf — single woord OR phrase. Case-insensitive matching in evaluator. */
  term: string;
  /** Citation-key uit citations.ts register voor provenance. */
  citationKey: string;
  /** Severity-laag per drie-laagse flagging. */
  severity: HeuristicSeverity;
  /** Optionele context-flag-extension (bijv. "alleen flaggen wanneer geen cijfer in zelfde zin"). */
  contextFlag?: string;
  /** Optional human-readable annotation tonen in bevindingen-tabel. */
  annotation?: string;
}

// ─── Package ────────────────────────────────────────

export interface HeuristicPackage {
  /** IETF BCP 47 locale-tag (matches Locale union). */
  locale: Locale;
  /** Per-category lookup; not all categories required (e.g. ai-tells alleen en-GB). */
  categories: Partial<Record<HeuristicCategory, HeuristicEntry[]>>;
  /**
   * Optional locale-specific rules die niet in standaard category-lookup passen
   * (bv. nl-BE address-form-rule: u-form default, je-form flag).
   */
  rules?: HeuristicRule[];
}

export interface HeuristicRule {
  /** Stable id voor consumer-side dispatch. */
  id: string;
  /** Korte beschrijving van wat de rule detecteert. */
  description: string;
  /** Citation-key uit citations.ts. */
  citationKey: string;
  /** Severity wanneer de rule fires. */
  severity: HeuristicSeverity;
}
