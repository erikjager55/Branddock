// ============================================================
// F-VAL Composition Engine
//
// Combineert de drie pijlers tot één FidelityCompositeResult:
//
//   Pijler 1: style-scorer        (deterministisch, brand voice match)
//   Pijler 2: G-Eval rubric       (cross-family AI judge, 6 dimensies)
//   Pijler 3: anti-tell + rules   (deterministisch, position + violations)
//
// Pillar weights komen uit FidelityConfig per workspace
// (default 0.35 / 0.45 / 0.20 — sum 1.0).
//
// Pijler 3 zelf is een sub-combinatie van twee deterministische signalen:
//   - AI-tell detector  (gewicht 0.6)
//   - BrandRule compiler (gewicht 0.4)
// Wanneer een workspace geen rules heeft, retourneert de compiler score=100
// en valt het 0.4-aandeel weg in de praktijk.
//
// Engine is een pure functie — geen DB-writes. Persistence (ContentFidelityScore
// records) gebeurt in een dunne wrapper bij het canvas-orchestrator-haakpunt.
// ============================================================

import { detectAiTells, type AiTellResult } from './ai-tell-detector';
import { evaluateBrandRules, type RuleEvaluationResult } from './rule-compiler';
import { runRubricJudge, type GeneratorProvider } from './judge-dispatcher';
import { scoreBrandStyle, type StyleScoreResult } from './style-scorer';
import { scoreVoiceSimilarity, type VoiceSimilarityResult } from './voice-similarity';
import type { GEvalDimension, GEvalResult } from './g-eval-rubric';

// ─── Input ──────────────────────────────────────────

interface PersonalityTraitInput {
  name?: string;
  description?: string;
  weAreThis?: string;
  butNeverThat?: string;
}

interface BrandPersonalityInput {
  personalityTraits?: PersonalityTraitInput[];
  wordsWeUse?: string[];
  brandVoiceDescription?: string;
}

export interface FidelityCompositionInput {
  /** Generated content text — UTF-8, ideaal < 50k chars */
  contentText: string;

  /** Workspace voor BrandRule lookup */
  workspaceId: string;

  /** Brand context voor G-Eval prompt */
  brandName: string;
  brandVoiceSummary: string;
  personaSummary?: string;
  strategySummary?: string;

  /** BrandPersonality declared signals voor pijler 1 */
  personality: BrandPersonalityInput | null;

  /** Generator provider — bepaalt cross-family judge keuze */
  generatorProvider: GeneratorProvider;

  /** Target word count voor length-control op pijler 2 composite */
  targetWordCount: number;

  /** Pillar weights — uit FidelityConfig, default 0.35 / 0.45 / 0.20 */
  pillarWeights?: {
    style?: number;
    judge?: number;
    rules?: number;
  };

  /** Per-dimensie weights binnen pijler 2 — default uit DIMENSIONS const */
  rubricWeights?: Partial<Record<GEvalDimension, number>>;

  /** Sla pijler 2 (AI judge) over voor snelle preview-pad. Default false. */
  skipJudge?: boolean;

  /** Composite ≥ deze waarde = thresholdMet. Default 75. */
  compositeThreshold?: number;

  /**
   * BrandVoiceguide centroid (1536-dim, OpenAI text-embedding-3-small).
   * Wanneer aanwezig wordt pijler 1 een 50/50 weighted combination van
   * de string-match composite uit `scoreBrandStyle` en de cosine-similarity
   * van de gegenereerde content tegen de centroid (W-1-full). Null of
   * undefined → pijler 1 valt terug op string-match alleen.
   */
  voiceguideCentroid?: number[] | null;
}

// ─── Output ─────────────────────────────────────────

export interface PillarBreakdown<T> {
  /** 0-100 normalized score */
  score: number;
  /** Effective weight in composite (0-1) */
  weight: number;
  /** Pillar-specific raw result */
  result: T;
}

export interface Pillar3RawResult {
  detector: AiTellResult;
  rules: RuleEvaluationResult;
  /** Detector contributie: 100 - humanBaselinePosition */
  detectorScore: number;
  /** Sub-weight gehanteerd binnen pijler 3 (default detector 0.6, rules 0.4) */
  detectorSubWeight: number;
  ruleSubWeight: number;
}

export interface FidelityCompositeResult {
  /** Final composite 0-100 (gewogen som van drie pijlers) */
  compositeScore: number;
  /** compositeScore >= compositeThreshold */
  thresholdMet: boolean;
  /** Threshold gehanteerd voor thresholdMet */
  compositeThreshold: number;
  /** Detector verdict — handig voor demo-UI top-line message */
  detectorVerdict: AiTellResult['verdict'];
  /** Position 0-100 op mens↔AI schaal — demo position-bar */
  humanBaselinePosition: number;
  /** Voice-similarity result (W-1-full). Null wanneer geen centroid of embedding-call faalde. */
  voiceSimilarity: VoiceSimilarityResult | null;
  /** Effective pijler 1 score = combinatie van style + voiceSimilarity wanneer beide beschikbaar */
  pillar1EffectiveScore: number;
  /** Pillar-niveau breakdown */
  pillars: {
    style: PillarBreakdown<StyleScoreResult>;
    judge: PillarBreakdown<GEvalResult> | null;
    rules: PillarBreakdown<Pillar3RawResult>;
  };
  /** Word count of analyzed content */
  wordCount: number;
  /** Compute time in ms */
  elapsedMs: number;
  /** Versie van de scoring-logica voor reproducibility (bewaard in ContentFidelityScore.scorerVersion) */
  scorerVersion: string;
}

// ─── Constants ──────────────────────────────────────

const SCORER_VERSION = 'composition-engine-v1.0';

const DEFAULT_PILLAR_WEIGHTS = {
  style: 0.35,
  judge: 0.45,
  rules: 0.20,
} as const;

/** Sub-weights binnen pijler 3 — detector dominant omdat rules optioneel zijn */
const DEFAULT_PILLAR3_DETECTOR_WEIGHT = 0.6;
const DEFAULT_PILLAR3_RULE_WEIGHT = 0.4;

const DEFAULT_COMPOSITE_THRESHOLD = 75;

// ─── Pure helpers ───────────────────────────────────

/**
 * Normaliseer pillar weights zodat ze tot 1.0 sommeren.
 * Een pijler waarvoor we geen signaal hebben (judge skipped, of style
 * zonder declared BrandPersonality vocab/traits) krijgt weight 0 en zijn
 * aandeel wordt herverdeeld over de actieve pijlers.
 */
function normalizeWeights(
  raw: { style?: number; judge?: number; rules?: number },
  skipJudge: boolean,
  skipStyle: boolean,
): { style: number; judge: number; rules: number } {
  const style = skipStyle ? 0 : (raw.style ?? DEFAULT_PILLAR_WEIGHTS.style);
  const judge = skipJudge ? 0 : (raw.judge ?? DEFAULT_PILLAR_WEIGHTS.judge);
  const rules = raw.rules ?? DEFAULT_PILLAR_WEIGHTS.rules;
  const sum = style + judge + rules;
  if (sum <= 0) {
    // Pathological — distribute evenly across active pillars
    if (!skipJudge && !skipStyle) return { style: 0.34, judge: 0.33, rules: 0.33 };
    if (!skipJudge) return { style: 0, judge: 0.5, rules: 0.5 };
    if (!skipStyle) return { style: 0.5, judge: 0, rules: 0.5 };
    return { style: 0, judge: 0, rules: 1 };
  }
  return { style: style / sum, judge: judge / sum, rules: rules / sum };
}

/**
 * Combineer detector + rule results tot één pijler 3 score.
 * Detector levert position 0-100 (0 = top mens) → invert naar score.
 */
function computePillar3(
  detector: AiTellResult,
  rules: RuleEvaluationResult,
): { score: number; raw: Pillar3RawResult } {
  const detectorScore = Math.max(0, Math.min(100, 100 - detector.humanBaselinePosition));
  const ruleScore = rules.ruleScore;

  const score = Math.round(
    detectorScore * DEFAULT_PILLAR3_DETECTOR_WEIGHT + ruleScore * DEFAULT_PILLAR3_RULE_WEIGHT,
  );

  return {
    score,
    raw: {
      detector,
      rules,
      detectorScore,
      detectorSubWeight: DEFAULT_PILLAR3_DETECTOR_WEIGHT,
      ruleSubWeight: DEFAULT_PILLAR3_RULE_WEIGHT,
    },
  };
}

// ─── Main API ───────────────────────────────────────

/**
 * Bereken de unified FidelityScore voor één stuk gegenereerde content.
 *
 * Pure functie — geen DB-writes. Pijler 2 doet één HTTPS call naar
 * de gekozen cross-family judge (GPT-5 of Sonnet). Pijlers 1 + 3 zijn
 * in-process en sub-millisecond.
 *
 * Volgorde:
 *   1. Synchrone pijlers (style, detector) parallel
 *   2. Async pijler 3b (rules — DB lookup met 60s cache)
 *   3. Pijler 2 (judge) — accepteert detector-output als pre-context
 *   4. Combine via genormaliseerde pillar weights
 */
export async function computeFidelityScore(
  input: FidelityCompositionInput,
): Promise<FidelityCompositeResult> {
  const startedAt = Date.now();

  const styleResult = scoreBrandStyle(input.contentText, input.personality);
  const detectorResult = detectAiTells(input.contentText);
  const rulesResult = await evaluateBrandRules(input.workspaceId, input.contentText);

  // W-1-full: voice-similarity via centroid embedding when available.
  // Runs in parallel with the deterministic pillars above (rules already async,
  // detector + scoreBrandStyle were sub-ms). Embedding call adds ~200-500ms.
  const voiceSimilarity = input.voiceguideCentroid
    ? await scoreVoiceSimilarity(input.contentText, input.voiceguideCentroid)
    : null;

  const pillar3 = computePillar3(detectorResult, rulesResult);

  // Pijler 1 effective score: combineer string-match composite met semantic
  // similarity wanneer beide beschikbaar. 50/50 wegen — beide signalen vangen
  // verschillende aspecten (declared vocab vs ritme/registers in samples).
  const hasStringSignal = styleResult.declaredSignalCount > 0;
  const hasSemanticSignal = voiceSimilarity !== null;
  let pillar1EffectiveScore = 0;
  if (hasStringSignal && hasSemanticSignal) {
    pillar1EffectiveScore = Math.round(styleResult.compositeScore * 0.5 + voiceSimilarity!.score * 0.5);
  } else if (hasStringSignal) {
    pillar1EffectiveScore = styleResult.compositeScore;
  } else if (hasSemanticSignal) {
    pillar1EffectiveScore = voiceSimilarity!.score;
  }

  // Skip pijler 1 alleen wanneer NEITHER signal is available.
  const skipStyle = !hasStringSignal && !hasSemanticSignal;

  const skipJudge = input.skipJudge === true;
  let judgeBreakdown: PillarBreakdown<GEvalResult> | null = null;

  if (!skipJudge) {
    const judgeResult = await runRubricJudge(
      {
        contentText: input.contentText,
        brandName: input.brandName,
        brandVoiceSummary: input.brandVoiceSummary,
        personaSummary: input.personaSummary,
        strategySummary: input.strategySummary,
        detectorResult,
      },
      {
        generatorProvider: input.generatorProvider,
        rubricWeights: input.rubricWeights,
        targetWordCount: input.targetWordCount,
      },
    );

    judgeBreakdown = {
      score: judgeResult.finalComposite,
      weight: 0, // filled in below after weight normalization
      result: judgeResult,
    };
  }

  const weights = normalizeWeights(input.pillarWeights ?? {}, skipJudge, skipStyle);

  const compositeScore = Math.round(
    (skipStyle ? 0 : pillar1EffectiveScore * weights.style) +
      (judgeBreakdown ? judgeBreakdown.score * weights.judge : 0) +
      pillar3.score * weights.rules,
  );

  const compositeThreshold = input.compositeThreshold ?? DEFAULT_COMPOSITE_THRESHOLD;

  if (judgeBreakdown) judgeBreakdown.weight = weights.judge;

  return {
    compositeScore,
    thresholdMet: compositeScore >= compositeThreshold,
    compositeThreshold,
    detectorVerdict: detectorResult.verdict,
    humanBaselinePosition: detectorResult.humanBaselinePosition,
    voiceSimilarity,
    pillar1EffectiveScore,
    pillars: {
      style: { score: pillar1EffectiveScore, weight: weights.style, result: styleResult },
      judge: judgeBreakdown,
      rules: { score: pillar3.score, weight: weights.rules, result: pillar3.raw },
    },
    wordCount: detectorResult.wordCount,
    elapsedMs: Date.now() - startedAt,
    scorerVersion: hasSemanticSignal ? `${SCORER_VERSION}+voice-emb-1.0` : SCORER_VERSION,
  };
}

// ─── Persistence-shape helpers ──────────────────────

/**
 * Format pillar scores in de Json-shape die ContentFidelityScore.pillarScores
 * verwacht. Persistence-laag (canvas-orchestrator wrapper) gebruikt dit om
 * naar Prisma te schrijven zonder de runtime types te leaken.
 */
export function formatPillarScoresJson(result: FidelityCompositeResult): Record<string, { score: number; weight: number }> {
  return {
    style: { score: result.pillars.style.score, weight: result.pillars.style.weight },
    judge: result.pillars.judge
      ? { score: result.pillars.judge.score, weight: result.pillars.judge.weight }
      : { score: 0, weight: 0 },
    rules: { score: result.pillars.rules.score, weight: result.pillars.rules.weight },
  };
}

/**
 * Format de zes G-Eval dimensies in de subCriteriaScores Json-shape.
 * Wanneer de judge is overgeslagen retourneert dit een leeg object.
 */
export function formatSubCriteriaScoresJson(
  result: FidelityCompositeResult,
): Record<string, { score: number; pillar: string; source: string; rationale?: string }> {
  if (!result.pillars.judge) return {};
  const out: Record<string, { score: number; pillar: string; source: string; rationale?: string }> = {};
  const judge = result.pillars.judge.result;
  for (const [key, dimScore] of Object.entries(judge.scores)) {
    out[key] = {
      score: dimScore.score,
      pillar: 'judge',
      source: `${judge.judgeProvider}/${judge.judgeModel}`,
      rationale: dimScore.reasoning,
    };
  }
  return out;
}

/**
 * Format pijler 3 violations in de ruleViolations Json-shape voor persistence.
 */
export function formatRuleViolationsJson(result: FidelityCompositeResult): Array<{
  ruleId: string;
  severity: string;
  message: string;
  snippet?: string;
  source: string;
  pillar: string;
}> {
  return result.pillars.rules.result.rules.violations.map((v) => ({
    ruleId: v.ruleId,
    severity: v.severity,
    message: v.message,
    snippet: v.snippet || undefined,
    source: 'rule-compiler',
    pillar: 'rules',
  }));
}

export const FIDELITY_SCORER_VERSION = SCORER_VERSION;
