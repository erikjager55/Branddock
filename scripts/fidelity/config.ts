// ============================================================
// scripts/fidelity/config.ts
//
// Configuratie voor F-VAL drift-meting research-tools.
// Brand-list, model IDs, paths, thresholds.
// ============================================================

import path from 'path';
import type { BrandSlug, DriftContentType, Condition } from './types';

// ─── Pilot brands (te finaliseren na completeness-check) ────

/**
 * Brands included in the drift-meting.
 *
 * Provisional list. To be confirmed after user runs completeness check
 * on Brand Personality + ToneOfVoice for each brand.
 *
 * If <2 brands have rich Brand Foundation, reduce to 2 brands; never
 * proceed with 3 brands of shallow data (methodologically worse than
 * 2 brands of deep data).
 */
export const PROVISIONAL_BRANDS: BrandSlug[] = ['wra', 'linfi', 'nobox'];

/** Content types — both included per WS2 protocol (structural vs narrative) */
export const CONTENT_TYPES: DriftContentType[] = ['case-study', 'thought-leadership'];

/** Word count target for both content types */
export const TARGET_WORD_COUNT = 3000;
export const ACCEPTABLE_WORD_RANGE: [number, number] = [2700, 3300];

// ─── Conditions (3rd is optional, requires APPROVED corpus) ─

/**
 * Conditions A and B always run. Condition C only if at least one brand
 * has ≥5 APPROVED content pieces in the workspace (corpus-grounded centroid
 * is methodologically meaningless with <5 reference pieces).
 */
export const ALWAYS_CONDITIONS: Condition[] = ['A', 'B'];
export const CORPUS_THRESHOLD_FOR_CONDITION_C = 5;

// ─── Models ─────────────────────────────────────────────────

export const GENERATOR_MODEL = 'claude-opus-4-7-20260301';
export const PRIMARY_JUDGE_MODEL = 'gpt-5'; // OpenAI — cross-family with generator
export const PARALLEL_JUDGE_MODEL = 'claude-sonnet-4-6-20251001'; // Anthropic — same-family agreement signal

/** Token budget for generation (Opus 4.7 long-form) */
export const GENERATOR_MAX_TOKENS = 8000;
export const GENERATOR_THINKING_BUDGET = 12000;

/** Token budget for judge calls (per dimension, JSON output) */
export const JUDGE_MAX_TOKENS = 1000;

// ─── Thresholds ─────────────────────────────────────────────

/** Mean per-dimension delta between GPT-5 and Sonnet that triggers high-disagreement flag */
export const AGREEMENT_DELTA_THRESHOLD = 1.5; // on 1-10 scale

/** Required minimum agreement-score for output to be included in LLM aggregate */
export const MIN_AGREEMENT_SCORE = 7; // on 0-10 scale, where 10 = perfect

// ─── Paths ──────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '..', '..');

export const PATHS = {
  /** Research output root (gitignored data dir) */
  outputRoot: path.join(REPO_ROOT, 'research', 'fidelity-week1'),
  bvdDumps: path.join(REPO_ROOT, 'research', 'fidelity-week1', 'bvd-dumps'),
  briefings: path.join(REPO_ROOT, 'research', 'fidelity-week1', 'briefings'),
  conditions: path.join(REPO_ROOT, 'research', 'fidelity-week1', 'conditions'),
  outputs: path.join(REPO_ROOT, 'research', 'fidelity-week1', 'outputs'),
  scoresGpt5: path.join(REPO_ROOT, 'research', 'fidelity-week1', 'scores', 'gpt5'),
  scoresSonnet: path.join(REPO_ROOT, 'research', 'fidelity-week1', 'scores', 'sonnet'),
  scoresHumans: path.join(REPO_ROOT, 'research', 'fidelity-week1', 'scores', 'humans'),
  reports: path.join(REPO_ROOT, 'research', 'fidelity-week1', 'reports'),
} as const;

// ─── Filename helpers ───────────────────────────────────────

/** Build canonical key for a drift run: `{brand}-{type}-{condition}` */
export function runKey(brand: BrandSlug, type: DriftContentType, condition: Condition): string {
  return `${brand}-${type}-${condition}`;
}

/** Briefing filename (no condition — same briefing used for both A and B) */
export function briefingFilename(brand: BrandSlug, type: DriftContentType): string {
  return `${brand}-${type}.md`;
}
