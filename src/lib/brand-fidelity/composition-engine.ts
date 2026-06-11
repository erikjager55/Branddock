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
import { evaluateHeuristics } from './heuristics/evaluator';
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

  /**
   * Audit 2026-06-10: BrandVoiceguide.vocabularyDo — wordt net als wordsWeUse
   * bewust in generatie-prompts geseed ("Gebruik waar natuurlijk") en hoort
   * dus in de allowlist van detector + rules-heuristiek. Zonder dit werd bv.
   * Napking's geseede 'flexibel' 13× als vague-quality bestraft. Telt NIET
   * mee in pijler-1-style-coverage (dat blijft wordsWeUse-only).
   */
  brandVocabularyDo?: string[];

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

  /**
   * Δ-3 voice-baseline 1-pager — compact markdown view voor pijler 2 judge-prompt.
   * Vervangt ad-hoc voiceguide-field-includes met canonical methodology-conform
   * format. Empty-baseline-string werkt safe (placeholders), prompt valt terug
   * op `brandVoiceSummary` alleen wanneer 1-pager niet meegeleverd is.
   */
  voiceBaseline1Pager?: string;
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
  /** Gezet wanneer de judge-pijler faalde en de weging zonder judge is herverdeeld (foutmelding als reden). */
  judgeDegraded?: string;
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

export const DEFAULT_COMPOSITE_THRESHOLD = 75;

// ─── Pure helpers ───────────────────────────────────

/**
 * Dedupe violations op `(position, snippet)` — wanneer BrandRule en
 * heuristic-pack hetzelfde woord op dezelfde char-offset matchen (typisch
 * scenario: user heeft "innovatief" in wordsWeAvoid → stem-variant
 * matcht "innovatie"; heuristic NL-NL corporate-fluff matcht ook
 * "innovatie") zou de pijler-3 score anders dubbel-getelde penalty geven
 * en de findings-tabel zou twee rows tonen voor één textspan.
 *
 * Tie-break-regels:
 *   1. Hogere severity wint (error > warning > info) — sterker signaal
 *      gaat boven zwakker
 *   2. Bij gelijke severity wint heuristic — rijkere category-mapping
 *      (Voice/Claims/Style/AI_TELL) is informatiever dan BrandRule
 *      fallback naar TERMINOLOGY
 *
 * User-intent (wordsWeAvoid) blijft gehonoreerd: hetzelfde woord wordt
 * nog steeds geflagged, maar via de heuristic-violation (waarvan de
 * category meer context geeft over WAAROM het buzzword is).
 */
export function dedupeViolations(
  violations: import('./rule-compiler').RuleViolation[],
): import('./rule-compiler').RuleViolation[] {
  const SEVERITY_RANK: Record<string, number> = { error: 0, warning: 1, info: 2 };
  const map = new Map<string, import('./rule-compiler').RuleViolation>();

  for (const v of violations) {
    // Document-level violations (sentinel position=0 + empty snippet) hebben
    // geen uniek (position, snippet) — die behouden we 1-op-1 op ruleId om
    // legitieme verschillende rule-violations niet te collapsen.
    const key =
      v.position === 0 && !v.snippet
        ? `doc:${v.ruleId}`
        : `${v.position}:${v.snippet}`;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, v);
      continue;
    }
    const existingRank = SEVERITY_RANK[existing.severity] ?? 99;
    const newRank = SEVERITY_RANK[v.severity] ?? 99;
    if (newRank < existingRank) {
      map.set(key, v);
    } else if (newRank === existingRank) {
      const existingIsHeuristic = existing.ruleId.startsWith('heuristic:');
      const newIsHeuristic = v.ruleId.startsWith('heuristic:');
      if (newIsHeuristic && !existingIsHeuristic) {
        map.set(key, v);
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Merge BrandRule evaluator-result met heuristic-violations (Δ-2). Recompute
 * ruleScore + counters om beide bronnen te reflecteren. Hergebruikt zelfde
 * scoring-formula als rule-compiler (weighted violations / wordCount * 1000).
 * Dedupe via `dedupeViolations` voorkomt dubbel-tellen wanneer beide bronnen
 * dezelfde textspan vangen.
 */
function mergeRuleResults(
  brandRules: RuleEvaluationResult,
  heuristicViolations: import('./rule-compiler').RuleViolation[],
): RuleEvaluationResult {
  const merged = dedupeViolations([
    ...brandRules.violations,
    ...heuristicViolations,
  ]);
  const SEVERITY_WEIGHTS = { error: 3, warning: 1, info: 0.5 };
  const weighted = merged.reduce((sum, v) => sum + (SEVERITY_WEIGHTS[v.severity] ?? 1), 0);
  const violationsPer1000 = brandRules.wordCount > 0 ? (weighted / brandRules.wordCount) * 1000 : 0;
  const ruleScore = Math.max(0, Math.min(100, Math.round(100 - violationsPer1000 * 2)));

  const byCount = { error: 0, warning: 0, info: 0 };
  const byType: typeof brandRules.byType = {
    FORBIDDEN_WORD: 0,
    REQUIRED_PHRASE: 0,
    STYLE_LIMIT: 0,
    PILLAR_REFERENCE: 0,
  };
  for (const v of merged) {
    byCount[v.severity]++;
    byType[v.ruleType]++;
  }

  return {
    violations: merged,
    ruleScore,
    byCount,
    byType,
    wordCount: brandRules.wordCount,
    rulesEvaluated: brandRules.rulesEvaluated + heuristicViolations.length,
  };
}

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

  // 2026-05-19: brand-allowlist zodat brand-defining vocabulary (bv "maatwerk"
  // / "op maat" voor luxe-merken) niet als vague-quality wordt geflagd.
  // wordsWeUse fungeert als explicit-brand-signal lijst die heuristic-overlap
  // overruled. Audit 2026-06-10: zelfde allowlist nu óók naar de ai-tell-
  // detector — het detector-lexicon bevat letterlijk seed-woorden ('naadloos',
  // 'op maat') waardoor de judge hetzelfde woord prees én bestrafte.
  const brandAllowlist = [
    ...(input.personality?.wordsWeUse ?? []),
    ...(input.brandVocabularyDo ?? []),
  ];
  const detectorResult = detectAiTells(input.contentText, { brandVocabulary: brandAllowlist });

  // Pijler 3: parallel-fetch BrandRule evaluator (DB-backed) + heuristics
  // evaluator (Δ-2 — locale-package). Merge into single RuleEvaluationResult
  // zodat downstream pillar3 score-logic ongewijzigd blijft.
  const [brandRulesResult, heuristicsResult] = await Promise.all([
    evaluateBrandRules(input.workspaceId, input.contentText),
    evaluateHeuristics(input.workspaceId, input.contentText, { brandAllowlist }),
  ]);
  const rulesResult = mergeRuleResults(brandRulesResult, heuristicsResult.violations);

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
  let judgeDegraded: string | null = null;

  if (!skipJudge) {
    // A judge failure (malformed response, <4 scoreable dimensions, missing
    // text block) degrades to a judge-less composite via the existing
    // skipJudge weight redistribution instead of killing the whole run —
    // a fabricated composite-50 was the old behavior, a 500 the alternative.
    try {
      const judgeResult = await runRubricJudge(
        {
          contentText: input.contentText,
          brandName: input.brandName,
          brandVoiceSummary: input.brandVoiceSummary,
          voiceBaseline1Pager: input.voiceBaseline1Pager,
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
    } catch (err) {
      judgeDegraded = err instanceof Error ? err.message : String(err);
      console.warn('[composition-engine] judge pillar degraded — weights redistributed', {
        message: judgeDegraded,
      });
    }
  }

  const weights = normalizeWeights(input.pillarWeights ?? {}, skipJudge || judgeDegraded !== null, skipStyle);

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
    ...(judgeDegraded !== null ? { judgeDegraded } : {}),
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
