// =============================================================
// Ad Quality Validation Layer — shared types
//
// Per ADR 2026-05-22-ad-quality-validation + spec
// docs/specs/ad-quality-validation.md.
//
// L1 = static deterministic rule-engine (pure functions over the
// generated content + metadata). L2 = AI-judge laag (LLM evaluate
// against platform-specific quality dimensions).
// =============================================================

import type { BrandContextBlock } from '@/lib/ai/prompt-templates';

export type RuleStatus = 'pass' | 'warn' | 'fail';
export type RuleCategory = 'mechanical' | 'structural' | 'coverage';

export interface RuleResult {
  /** Stable identifier — `<contentType>.<rule-name>[.<sub-key>]` */
  ruleId: string;
  category: RuleCategory;
  status: RuleStatus;
  /** Human-readable explanation, surfaced in the drawer UI */
  message: string;
  /** Optional one-line fix hint */
  suggestion?: string;
  /** Which group triggered, for UI highlight via "Go to field" link */
  fieldGroup?: string;
}

export interface ComponentTemplateItem {
  type: string;
  required?: boolean;
  maxLength?: number;
}

/** Per-asset content as resolved from the selected variant. Keyed by groupType. */
export type GroupContents = Map<string, string>;

export interface ValidatorContext {
  groups: GroupContents;
  platform: string;
  contentType: string;
  /** SEO keyword passed via canvasContextStack.contentTypeInputs (search-ad). */
  primaryKeyword?: string;
  componentTemplate: ComponentTemplateItem[];
  brandContext: BrandContextBlock;
  /** Indicates whether an image asset was selected (hero image or generated). */
  hasImage: boolean;
  /** Image-generation prompt of the selected hero image (imagePromptUsed), if any.
   *  Image components carry no generatedContent, so groups.get('image') is
   *  always empty — judges must read this field instead. */
  imageDirection: string | null;
}

export type Rule = (ctx: ValidatorContext) => RuleResult[];

// ── L2 judge types ──────────────────────────────────────────

export interface L2DimensionScore {
  /** 0-100 per dimension. */
  score: number;
  /** 1-2 sentence why. */
  rationale: string;
  /** Optional 1-sentence improvement suggestion. */
  suggestion?: string;
}

export interface L2JudgeSuccess {
  dimensions: Record<string, L2DimensionScore>;
  /** 1-2 sentence overall verdict from the judge. */
  summary: string;
}

export interface L2JudgeFallback {
  error: string;
  fallback: true;
}

export type L2JudgeResult = L2JudgeSuccess | L2JudgeFallback;

export function isFallback(r: L2JudgeResult): r is L2JudgeFallback {
  return 'fallback' in r && r.fallback === true;
}

// ── Per-platform/type judge ─────────────────────────────────

export interface AdJudge {
  /** Build the user-side prompt; system prompt is set in dispatcher. */
  buildPrompt(ctx: ValidatorContext): string;
  /** Parse the raw model response into a structured L2JudgeSuccess. */
  parseResponse(raw: string): L2JudgeSuccess;
}

// ── Validator registry entry ────────────────────────────────

export interface ValidatorWeights {
  l1: number;
  l2: number;
}

export interface ValidatorEntry {
  rules: Rule[];
  judge: AdJudge;
  weights: ValidatorWeights;
}

// ── Aggregation output ──────────────────────────────────────

export type AdQualityLabel = 'poor' | 'average' | 'good' | 'excellent';

export interface AggregatedScore {
  overallScore: number;
  ratingLabel: AdQualityLabel;
}
