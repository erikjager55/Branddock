// ============================================================
// scripts/fidelity/types.ts
//
// Gedeelde TypeScript types voor de F-VAL drift-meting research-tools.
// Pure type-definities — geen runtime-logica.
// ============================================================

// ─── Brand & content metadata ────────────────────────────────

export type BrandSlug = 'wra' | 'linfi' | 'nobox' | 'better-brands';

export type DriftContentType = 'case-study' | 'thought-leadership';

export type Condition = 'A' | 'B' | 'C';

export interface DriftRun {
  brandSlug: BrandSlug;
  contentType: DriftContentType;
  condition: Condition;
  /** Computed key — used as filename: `{brand}-{type}-{condition}` */
  key: string;
}

// ─── Briefing (pre-geregistreerd, committed naar git) ───────

export interface Briefing {
  brandSlug: BrandSlug;
  contentType: DriftContentType;
  /** Markdown body of the briefing (audience, objective, key message, constraints) */
  body: string;
  /** ISO timestamp of pre-registration commit */
  preRegisteredAt: string;
}

// ─── Generation output ──────────────────────────────────────

export interface GenerationOutput {
  run: DriftRun;
  /** Full system prompt sent to Opus 4.7 (BVD + briefing + structural instructions) */
  systemPrompt: string;
  /** Generated content (markdown) */
  content: string;
  /** Word count of generated content */
  wordCount: number;
  /** Token usage from Opus 4.7 */
  inputTokens: number;
  outputTokens: number;
  /** ISO timestamp of generation */
  generatedAt: string;
  /** Model used (claude-opus-4-7-XXX) */
  generatorModel: string;
}

// ─── Judge scoring ──────────────────────────────────────────

export type JudgeProvider = 'openai' | 'anthropic';

export type DriftDimension =
  | 'voiceFit'
  | 'brandRecognition'
  | 'naturalness'
  | 'fluency';

export interface DimensionScore {
  /** Integer 1-10 */
  score: number;
  reasoning: string;
  /** Quote from content showing strong alignment, or empty string */
  exampleStrong: string;
  /** Quote from content showing misalignment, or empty string */
  exampleWeak: string;
}

export interface JudgeScoreSet {
  run: DriftRun;
  judgeProvider: JudgeProvider;
  judgeModel: string;
  scores: Record<DriftDimension, DimensionScore>;
  /** Mean of 4 dimension scores, 1-10 */
  compositeScore: number;
  computedAt: string;
}

// ─── Human evaluation ───────────────────────────────────────

export interface HumanRating {
  run: DriftRun;
  evaluatorId: string;
  /** Anonymized — evaluator does NOT know which condition this is */
  blinded: true;
  scores: Record<DriftDimension, { score: number; comment?: string }>;
  compositeScore: number;
  ratedAt: string;
}

// ─── Aggregation outputs ────────────────────────────────────

export interface AgreementMetric {
  run: DriftRun;
  /** Mean absolute delta between GPT-5 and Sonnet 4.6 scores across 4 dimensions */
  meanDelta: number;
  /** 0-10 scale, computed as 10 - meanDelta * 2; threshold for high-agreement = 7 */
  agreementScore: number;
  isHighAgreement: boolean;
}

export interface ConditionSummary {
  condition: Condition;
  /** Number of outputs in this condition (excluding low-agreement ones for LLM aggregate) */
  outputCount: number;
  /** Mean composite voice-fit per source (judge or human) */
  voiceFit: {
    gpt5Mean: number;
    gpt5Std: number;
    sonnetMean: number;
    sonnetStd: number;
    humanMean: number | null;
    humanStd: number | null;
  };
}

export interface DriftReport {
  generatedAt: string;
  brands: BrandSlug[];
  contentTypes: DriftContentType[];
  conditions: Condition[];
  /** Per-condition aggregate */
  conditionSummaries: ConditionSummary[];
  /** Conditie B vs A drift, signed (positive = B beats A) */
  driftBvsA: {
    gpt5: number;
    sonnet: number;
    human: number | null;
  };
  /** Outputs flagged for high disagreement between judges (excluded from LLM aggregate) */
  highDisagreementOutputs: string[];
  /** Final scope-decision — only set after human ratings */
  scopeDecision?: 'A' | 'B' | 'C' | 'pending-humans';
}

// ─── BVD verification (sectie 2.2 van schema-audit) ─────────

export interface BvdDump {
  workspaceSlug: string;
  workspaceName: string;
  /** Full output of buildBrandVoiceDirective() */
  bvdOutput: string;
  /** Approximate token count (chars / 4) */
  approxTokens: number;
  /** Field-coverage analysis */
  fieldCoverage: {
    brandPersonalityFields: number;  // out of 13
    toneOfVoiceFields: number;       // out of 18
    brandVoiceFields: number;        // out of 3 (content-style only)
    totalFieldsPresent: number;      // out of ~25 unique
  };
  /** Whether each major field is present in the output */
  fieldPresence: Record<string, boolean>;
  dumpedAt: string;
}
