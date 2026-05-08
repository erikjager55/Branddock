// ============================================================
// Pijler 2 — G-Eval rubric
//
// Zes dimensies, cross-family judge (Claude generator → GPT-5 judge,
// of omgekeerd). Eén JSON call per output dat alle dimensies dekt.
//
// Anti-pattern compliance dimensie krijgt de detector-output als
// pre-context, zodat de judge het deterministische signaal verbalisert
// in plaats van zelf tells te detecteren (dat is al deterministisch
// gedaan).
//
// Length-controlled scoring: outputs die zwaar afwijken van het target
// woord-aantal krijgen een conciseness-penalty op composite (niet op
// individuele dimensies — die worden onafhankelijk beoordeeld).
// ============================================================

import type { AiTellResult } from './ai-tell-detector';

// ─── Dimensie-definities ─────────────────────────────

export type GEvalDimension =
  | 'strategicAnchoring'
  | 'audienceFit'
  | 'brandRecognition'
  | 'antiPattern'
  | 'coherence'
  | 'concreteness';

export interface DimensionDefinition {
  key: GEvalDimension;
  label: string;
  weight: number;
  description: string;
  /** Concrete instructies voor de judge — wat scoort hoog/laag */
  rubric: string;
}

/**
 * Default rubric weights (sum 1.0). Anti-pattern compliance is het
 * zwaarste — empirisch gevalideerd in week 1 dat dit het primaire
 * Branddock-vs-ChatGPT differentiator is.
 *
 * Per-workspace overrides via FidelityConfig.rubricWeights.
 */
export const DIMENSIONS: DimensionDefinition[] = [
  {
    key: 'strategicAnchoring',
    label: 'Strategische verankering',
    weight: 0.20,
    description:
      'Hoe goed verankert de output zich in het strategisch doel of pijler van de campagne/merk?',
    rubric: `Score 1-10 op de mate waarin de output zich verankert in de strategische context:
- 9-10: elke sectie laat zien hoe het bijdraagt aan de strategische doelen; pijlers expliciet genoemd
- 7-8: strategische verankering aanwezig maar niet altijd expliciet
- 5-6: oppervlakkig aanwezig — content "klopt" maar verbinding met strategie ontbreekt
- 3-4: generiek, los van merk-strategie
- 1-2: geen verankering; zou voor elk merk kunnen werken`,
  },
  {
    key: 'audienceFit',
    label: 'Doelgroep-fit',
    weight: 0.15,
    description:
      'Spreekt de output de declared persona aan — pijnpunten, taal, register, frustraties?',
    rubric: `Score 1-10 op alignment met declared target persona:
- 9-10: persona-specifieke pijnpunten/triggers geadresseerd; register past
- 7-8: persona herkenbaar maar enkele generieke elementen
- 5-6: doelgroep-niveau klopt globaal, niet specifiek
- 3-4: generieke "businessgebruiker" zonder specificiteit
- 1-2: aanspraak voelt verkeerd voor persona`,
  },
  {
    key: 'brandRecognition',
    label: 'Brand-recognition',
    weight: 0.15,
    description:
      'Zou een geïnformeerde lezer dit blind kunnen herkennen als afkomstig van DIT specifieke merk?',
    rubric: `Score 1-10 op merk-distinctiveness — zou een lezer blind het merk herkennen?
- 9-10: zeer distinctief; signature-frases en kenmerkende stijl
- 7-8: herkenbaar door enkele markers
- 5-6: kan plausibel van dit merk zijn maar net zo goed van een concurrent
- 3-4: generiek voor de sector
- 1-2: niet onderscheidbaar van willekeurige sector-content`,
  },
  {
    key: 'antiPattern',
    label: 'Anti-pattern compliance',
    weight: 0.30,
    description:
      'Vermijdt de output bekende AI-tells (overdreven adjectieven, contrast-formules, marketing-clichés)? De detector heeft al kwantitatief gewerkt; jouw taak: verbalis de severity.',
    rubric: `Score 1-10 op anti-pattern compliance — gebruik ALLEEN de detector-output uit "Detector context" hieronder:
- humanBaselinePosition < 12: 9-10 (TOP_TIER, geen werk meer nodig)
- humanBaselinePosition 12-30: 7-8 (HUMAN_BASELINE)
- humanBaselinePosition 30-50: 4-6 (AI_LEANING — herkenbaar AI)
- humanBaselinePosition 50+: 1-3 (PURE_AI)
Voeg in reasoning een korte verbalisering toe: welke tell-categorieën dragen het meest bij?`,
  },
  {
    key: 'coherence',
    label: 'Boodschap-coherentie',
    weight: 0.10,
    description:
      'Vormt de output één samenhangend argument met logische opbouw?',
    rubric: `Score 1-10 op narratieve coherentie:
- 9-10: rode draad volledig consistent; elke sectie bouwt op vorige
- 7-8: logische opbouw met enkele zwakkere transities
- 5-6: secties kloppen los maar verbinding is zwak
- 3-4: opvallend repetitief of springend
- 1-2: geen rode draad`,
  },
  {
    key: 'concreteness',
    label: 'Concretheid',
    weight: 0.10,
    description:
      'Maakt de output abstracte claims concreet met voorbeelden, getallen, namen, situaties?',
    rubric: `Score 1-10 op concreetheid (anti-vague):
- 9-10: elke abstracte claim heeft concreet voorbeeld/getal/case
- 7-8: voornamelijk concreet met enkele lossere passages
- 5-6: gebalanceerd maar veel ruimte voor specificiteit
- 3-4: vage referenties ("in talloze projecten", "diverse studies")
- 1-2: pure abstracte taal zonder anker`,
  },
];

// Map for O(1) lookup
const DIMENSION_BY_KEY = new Map(DIMENSIONS.map((d) => [d.key, d]));

export function getDimension(key: GEvalDimension): DimensionDefinition {
  const d = DIMENSION_BY_KEY.get(key);
  if (!d) throw new Error(`Unknown dimension: ${key}`);
  return d;
}

// ─── Length control ──────────────────────────────────

export interface LengthControlResult {
  /** Multiplier 0-1 om op composite toe te passen */
  multiplier: number;
  /** Reden voor multiplier (logging/debug) */
  reason: string;
}

/**
 * Length-controlled scoring multiplier.
 *
 * Penalize outputs that strongly under- or over-shoot the target.
 * Verbosity bias mitigatie: te lange outputs (>130% target) krijgen
 * milde penalty; te korte (<70%) krijgen forse penalty.
 *
 * Multiplier wordt op COMPOSITE toegepast, niet op individuele
 * dimension scores. Dimensions blijven zuiver.
 */
export function computeLengthMultiplier(
  actualWordCount: number,
  targetWordCount: number,
): LengthControlResult {
  if (targetWordCount <= 0) return { multiplier: 1, reason: 'No target — no penalty' };
  const ratio = actualWordCount / targetWordCount;

  if (ratio < 0.5) return { multiplier: 0.6, reason: `Severely short (${Math.round(ratio * 100)}% of target)` };
  if (ratio < 0.7) return { multiplier: 0.8, reason: `Short (${Math.round(ratio * 100)}% of target)` };
  if (ratio > 1.5) return { multiplier: 0.85, reason: `Verbose (${Math.round(ratio * 100)}% of target)` };
  if (ratio > 1.3) return { multiplier: 0.95, reason: `Slightly verbose (${Math.round(ratio * 100)}% of target)` };
  return { multiplier: 1, reason: `On target (${Math.round(ratio * 100)}%)` };
}

// ─── Prompt builders ─────────────────────────────────

export interface RubricPromptContext {
  contentText: string;
  brandName: string;
  /** Genormaliseerde brand voice samenvatting (uit BVD/BrandPersonality) */
  brandVoiceSummary: string;
  /**
   * Δ-3 voice-baseline 1-pager — compact markdown view (≤300 woorden) afgeleid
   * uit BrandVoiceguide via deriveVoiceBaseline1Pager + formatVoiceBaseline1Pager.
   * Wanneer aanwezig wordt deze als BRAND_VOICE-section toegevoegd aan de prompt
   * naast `brandVoiceSummary` (die one-liner blijft voor backwards-compat).
   */
  voiceBaseline1Pager?: string;
  /** Persona-context indien beschikbaar — primary persona name + key triggers */
  personaSummary?: string;
  /** Strategische pijler/doel uit campagne — leeg als content niet aan campagne hangt */
  strategySummary?: string;
  /** Detector-output voor pre-computed anti-pattern signal */
  detectorResult: AiTellResult;
}

export const G_EVAL_SYSTEM_PROMPT = `You are an expert evaluator of brand-aligned content quality. You assess generated content against six independent dimensions:

1. Strategische verankering (strategic anchoring)
2. Doelgroep-fit (audience fit)
3. Brand-recognition (distinctiveness)
4. Anti-pattern compliance (AI-tell avoidance — uses pre-computed detector output)
5. Boodschap-coherentie (narrative coherence)
6. Concretheid (concreteness, anti-vague)

Score each dimension 1-10 INDEPENDENTLY using the rubric provided. Avoid:
- Halo effect (don't let one strong/weak signal influence other dimensions)
- Verbosity bias (don't reward longer outputs unless extra length adds value)
- Self-preference bias (you may be a different model from the generator — score on rubric, not familiarity)

For each dimension, provide:
- score (integer 1-10)
- reasoning (2-3 sentences citing specific passages)

Return strict JSON only — no preamble, no markdown fence.`;

export function buildRubricUserPrompt(ctx: RubricPromptContext): string {
  const detectorContext = [
    `### Detector context (pre-computed for anti-pattern dimension)`,
    `- Verdict: ${ctx.detectorResult.verdict}`,
    `- Position: ${ctx.detectorResult.humanBaselinePosition}/100 (0=top mens, 100=pure AI)`,
    `- Score: ${ctx.detectorResult.scorePer1000Words.toFixed(1)} per 1000 woorden`,
    `- Unique tells: ${ctx.detectorResult.uniqueTellCount} of ${ctx.detectorResult.detected.length > 0 ? '30' : '30'}`,
    `- Top tells: ${ctx.detectorResult.detected.slice(0, 3).map((d) => `${d.definition.id} (${d.count}×)`).join(', ') || 'none'}`,
  ].join('\n');

  const rubricBlocks = DIMENSIONS.map(
    (d) => `### ${d.label} (${d.key}, weight ${d.weight})\n${d.rubric}`,
  ).join('\n\n');

  // Δ-3: prefer expanded voice-baseline 1-pager when supplied (canonical
  // methodology-conform format); brandVoiceSummary blijft als fallback when
  // 1-pager niet meegeleverd is (backwards-compat voor consumers die nog niet
  // door brand-context lopen).
  const voiceSection = ctx.voiceBaseline1Pager
    ? `${ctx.voiceBaseline1Pager}\n\n**Voice summary (one-liner)**: ${ctx.brandVoiceSummary}`
    : `**Voice summary**: ${ctx.brandVoiceSummary}`;

  return `## Brand context

**Brand**: ${ctx.brandName}
${voiceSection}
${ctx.personaSummary ? `**Target persona**: ${ctx.personaSummary}` : ''}
${ctx.strategySummary ? `**Strategic pillar**: ${ctx.strategySummary}` : ''}

## Generated content (${ctx.contentText.split(/\s+/).filter(Boolean).length} words)

${ctx.contentText}

${detectorContext}

## Rubric

${rubricBlocks}

## Output

Return JSON in exactly this shape:
{
  "scores": {
    "strategicAnchoring": { "score": <1-10>, "reasoning": "..." },
    "audienceFit":        { "score": <1-10>, "reasoning": "..." },
    "brandRecognition":   { "score": <1-10>, "reasoning": "..." },
    "antiPattern":        { "score": <1-10>, "reasoning": "..." },
    "coherence":          { "score": <1-10>, "reasoning": "..." },
    "concreteness":       { "score": <1-10>, "reasoning": "..." }
  }
}`;
}

// ─── Response schema ────────────────────────────────

export interface DimensionScore {
  score: number;
  reasoning: string;
}

export interface GEvalResult {
  scores: Record<GEvalDimension, DimensionScore>;
  /** Weighted composite (0-100, op basis van weights) */
  weightedComposite: number;
  /** After length-multiplier toegepast */
  finalComposite: number;
  /** Length-control breakdown */
  lengthControl: LengthControlResult;
  /** Voor traceability */
  judgeProvider: 'openai' | 'anthropic';
  judgeModel: string;
  computedAtMs: number;
}

/**
 * Validate + normalize a raw judge response into typed GEvalResult.
 * Clamp scores to 1-10. Reject malformed.
 */
export function normalizeRubricResponse(
  raw: unknown,
  meta: {
    judgeProvider: 'openai' | 'anthropic';
    judgeModel: string;
    actualWordCount: number;
    targetWordCount: number;
    rubricWeights?: Partial<Record<GEvalDimension, number>>;
  },
): GEvalResult {
  const obj = raw as { scores?: Record<string, Partial<DimensionScore>> };
  const rawScores = obj?.scores ?? {};

  function clampScore(n: unknown): number {
    const v = typeof n === 'number' ? n : Number(n);
    if (!Number.isFinite(v)) return 5;
    return Math.max(1, Math.min(10, Math.round(v)));
  }

  function dim(key: GEvalDimension): DimensionScore {
    const d = rawScores[key] ?? {};
    return {
      score: clampScore(d.score),
      reasoning: typeof d.reasoning === 'string' ? d.reasoning : '',
    };
  }

  const scores: Record<GEvalDimension, DimensionScore> = {
    strategicAnchoring: dim('strategicAnchoring'),
    audienceFit: dim('audienceFit'),
    brandRecognition: dim('brandRecognition'),
    antiPattern: dim('antiPattern'),
    coherence: dim('coherence'),
    concreteness: dim('concreteness'),
  };

  // Weighted composite (1-10 scale, then *10 = 0-100)
  let weightedSum = 0;
  let weightTotal = 0;
  for (const def of DIMENSIONS) {
    const weight = meta.rubricWeights?.[def.key] ?? def.weight;
    weightedSum += scores[def.key].score * weight;
    weightTotal += weight;
  }
  const weightedComposite = Math.round((weightedSum / weightTotal) * 10);

  // Length-control multiplier
  const lengthControl = computeLengthMultiplier(meta.actualWordCount, meta.targetWordCount);
  const finalComposite = Math.round(weightedComposite * lengthControl.multiplier);

  return {
    scores,
    weightedComposite,
    finalComposite,
    lengthControl,
    judgeProvider: meta.judgeProvider,
    judgeModel: meta.judgeModel,
    computedAtMs: Date.now(),
  };
}
