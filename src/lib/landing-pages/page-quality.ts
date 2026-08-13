import { wordCount, componentTypeCounts, flattenPuckTextForJudge, type PuckLikeData } from './puck-data-flatten';
import type { CanvasContextStack } from '../ai/canvas-context';
import {
  evaluateLandingPageQuality,
  type LandingPageDimensionScores,
} from './landing-page-quality';

/**
 * Page-quality stub for Phase 6 auto-iterate. Production replaces this
 * with the existing F-VAL judge (style + judge + rules composite) per
 * ADR 2026-05-22-landing-page-builder-architectuur Phase 6 section.
 *
 * Heuristic scoring (range 0-100, target threshold 70):
 *   - +30 base
 *   - +30 if wordCount in healthy range (40-400; below = too thin,
 *     above = bloated landing-page)
 *   - +15 if has BrandHero (every landing page needs a hero)
 *   - +15 if has BrandCTA (every conversion-focused page needs a CTA)
 *   - +10 if has a proof component (Testimonial or PricingTable or FAQ)
 *
 * Pure function — smoke-testable without DB / AI calls. When swapped for
 * the real F-VAL judge, the route signature stays the same so consumers
 * don't change.
 */

export interface PageQualityResult {
  score: number;
  threshold: number;
  thresholdMet: boolean;
  signals: {
    wordCount: number;
    hasHero: boolean;
    hasCta: boolean;
    hasProof: boolean;
    components: Record<string, number>;
  };
}

const HEALTHY_WORD_MIN = 40;
const HEALTHY_WORD_MAX = 400;
const QUALITY_THRESHOLD = 70;

export function evaluatePageQuality(data: PuckLikeData): PageQualityResult {
  const words = wordCount(data);
  const counts = componentTypeCounts(data);
  const hasHero = (counts.BrandHero ?? 0) > 0;
  const hasCta = (counts.BrandCTA ?? 0) > 0;
  const hasProof = (counts.Testimonial ?? 0) > 0
    || (counts.PricingTable ?? 0) > 0
    || (counts.FAQ ?? 0) > 0;

  let score = 30;
  if (words >= HEALTHY_WORD_MIN && words <= HEALTHY_WORD_MAX) score += 30;
  if (hasHero) score += 15;
  if (hasCta) score += 15;
  if (hasProof) score += 10;

  return {
    score,
    threshold: QUALITY_THRESHOLD,
    thresholdMet: score >= QUALITY_THRESHOLD,
    signals: {
      wordCount: words,
      hasHero,
      hasCta,
      hasProof,
      components: counts,
    },
  };
}

// ─── Type-aware dispatch (B5 — lp-quality-dimensions-live) ───

/** Welke evaluator een type-aware score produceerde. */
export type PageQualityEvaluator = 'landing-page-dimensions' | 'generic-heuristic';

/**
 * Resultaat van `evaluatePageQualityForType`: het bestaande
 * `PageQualityResult`-contract (routes/consumers blijven ongewijzigd werken),
 * verrijkt met de evaluator-marker en — op het LP-dimensie-pad — de
 * dimensie-breakdown zodat de diff-modal kan tonen WAAROM een score laag is.
 */
export interface TypeAwarePageQualityResult extends PageQualityResult {
  evaluator: PageQualityEvaluator;
  /** 6-dimensie-breakdown — alleen aanwezig wanneer evaluator = 'landing-page-dimensions'. */
  dimensions?: LandingPageDimensionScores;
}

/**
 * Route-facing shape: `PageQualityResult` met de type-aware velden optioneel.
 * Het F-VAL deep-path retourneert de kale `PageQualityResult`; het type-aware
 * pad vult `evaluator` + `dimensions`. Routes annoteren hun score-functies met
 * dit type zodat `judgement.dimensions` toegankelijk is zonder narrowing.
 */
export type MaybeTypeAwarePageQualityResult = PageQualityResult & {
  evaluator?: PageQualityEvaluator;
  dimensions?: LandingPageDimensionScores;
};

/**
 * Type-aware page-quality dispatch (B5): gebruikt de 6 LP-specifieke
 * dimensies (`evaluateLandingPageQuality`, deterministisch — geen AI, geen
 * screenshots, geen DB) wanneer het content-type `landing-page` is, en valt
 * voor elk ander/onbekend type terug op de generieke 5-signal heuristic.
 *
 * Bewust ALLEEN `landing-page` op het dimensie-pad — `product-page` is
 * geëvalueerd en afgewezen omdat 3 van de 6 dimensies structureel misfiren
 * op de canonieke product-tree (`buildProductPageTemplateFromStructured`):
 *   1. anatomyCompleteness eist ≥2 FeatureGrids (trust-strip + features, LP-spec
 *      §2) + een Testimonial; het product-template emit max 1 FeatureGrid (of een
 *      FeatureSplit = 0 grids) en heeft géén testimonial-slot → schema-perfecte
 *      product-page blijft op 4/6 ≈ 67 hangen.
 *   2. socialProofPresence vereist een Testimonial voor 50 van de 100 punten →
 *      permanent gecapt op 50 (0 bij FeatureSplit-rendering).
 *   3. objectionCoverage's 100-band eist 5+ FAQ-items; productPageVariantSchema
 *      capt `faq` op max 4 → permanent gecapt op 60.
 * Die deficits zitten in de STRUCTUUR die het type niet mag hebben — de
 * text-only auto-iterate-rewrite kan ze nooit repareren, dus de composite zou
 * oneerlijk laag zijn en zinloze rewrites triggeren. heroClarity en
 * singleCtaDiscipline zouden wél passen (het product-schema enforcet single-CTA
 * via superRefine), maar 3/6 misfirende dimensies is diskwalificerend.
 *
 * WCAG (dim 7) en visual brand-fit (dim 8) blijven hier bewust uit: brandTokens
 * vergt een styleguide-fetch en vision een screenshot + AI-call — beide horen
 * niet op dit synchrone hot path. Threshold blijft 70 (beide modules definiëren 70).
 */
export function evaluatePageQualityForType(
  data: PuckLikeData,
  contentType: string | null | undefined,
): TypeAwarePageQualityResult {
  if (contentType === 'landing-page') {
    const lp = evaluateLandingPageQuality({ data });
    const counts = lp.signals.components;
    return {
      score: lp.composite,
      threshold: lp.threshold,
      thresholdMet: lp.thresholdMet,
      evaluator: 'landing-page-dimensions',
      dimensions: lp.dimensions,
      // Genormaliseerd naar het generieke signals-contract zodat bestaande
      // response-consumers (PuckPageBuilder) niets merken van de swap.
      signals: {
        wordCount: lp.signals.wordCount,
        hasHero: (counts.BrandHero ?? 0) > 0,
        hasCta: (counts.BrandCTA ?? 0) > 0,
        hasProof: (counts.Testimonial ?? 0) > 0
          || (counts.PricingTable ?? 0) > 0
          || (counts.FAQ ?? 0) > 0,
        components: counts,
      },
    };
  }
  return { ...evaluatePageQuality(data), evaluator: 'generic-heuristic' };
}

// ─── F-VAL judge integration (production path) ───────────────

/**
 * Inputs for the F-VAL-backed page-quality evaluator. Mirrors the runtime
 * dependencies of `runFidelityScoring` but kept loose so smoke-tests can
 * inject mocks without spinning up Prisma + Anthropic.
 *
 * `runFVal` is the injection point: in production routes wire the real
 * `runFidelityScoring` from `@/lib/brand-fidelity/fidelity-runner`; in
 * smoke-tests pass a mock that returns a deterministic composite score.
 */
export interface FvalEvaluatorInputs {
  data: PuckLikeData;
  ctx: CanvasContextStack;
  workspaceId: string;
  deliverableId: string;
  contentTypeId: string | null;
  runFVal: FvalRunner;
  /** F-VAL dimensie 8 vision-judge (optional). Wanneer aanwezig + scored:
   *  composite wordt geblend met 10% gewicht. Caller injecteert
   *  designPhilosophy + brand-context uit BrandStyleguide. */
  visionJudge?: {
    designPhilosophy?: string | null;
    brandName?: string;
    brandColors?: string[];
    brandImageryStyle?: string | null;
  };
}

/** Minimal contract over `runFidelityScoring` — keeps page-quality.ts free
 *  of brand-fidelity imports so the smoke-test can stub it. */
export type FvalRunner = (input: {
  workspaceId: string;
  deliverableId: string;
  contentTypeId: string | null;
  contentText: string;
  stack: CanvasContextStack;
}) => Promise<{
  composite: number;
  compositeThreshold: number;
  pillars: { style: number | null; judge: number | null; rules: number | null };
} | null>;

/**
 * Production page-quality evaluator backed by the existing F-VAL pipeline.
 *
 * Flow:
 *   1. flattenPuckTextForJudge → contentText for the judge (met sectielabels)
 *   2. runFidelityScoring (3-pillar composite) via injected runner
 *   3. Map FidelityRunOutcome → PageQualityResult shape so callers stay
 *      identical to the heuristic stub
 *
 * Fallback: when the runner returns null (word count < 50, missing brand
 * personality, etc.) we fall back to the type-aware evaluator (B5) so the
 * route never crashes — same defense-in-depth pattern as the spike
 * auto-iterate flow, now consistent with the fast heuristic-mode path.
 */
export async function evaluatePageQualityViaFVAL(
  input: FvalEvaluatorInputs,
): Promise<PageQualityResult> {
  // Audit 2026-06-10: judge-variant met sectielabels — de judge zag voorheen
  // één ongelabelde fragment-soep en strafte structuur af als incoherentie.
  const contentText = flattenPuckTextForJudge(input.data);
  const fvalOutcome = await input.runFVal({
    workspaceId: input.workspaceId,
    deliverableId: input.deliverableId,
    contentTypeId: input.contentTypeId,
    contentText,
    stack: input.ctx,
  });

  if (!fvalOutcome) {
    // B5: zelfde type-aware fallback als het snelle pad — de deep-score-route
    // degradeert dan naar exact dezelfde evaluator als heuristic-mode.
    return evaluatePageQualityForType(input.data, input.contentTypeId);
  }

  // Dimensie 8 — vision-judge: in deze server-context skippen omdat
  // buildSpikePuckConfig 'use client' is en niet server-side kan renderen.
  // Vision-judge blijft beschikbaar via /api/landing-pages/[id]/visual-brand-
  // fit-check route die een pre-captured screenshot van de client krijgt.
  // TODO v2: server-side Puck-render fix of HTML-only renderer voor judge.
  const blendedComposite = fvalOutcome.composite;

  const counts = componentTypeCounts(input.data);
  return {
    score: Math.round(blendedComposite),
    threshold: fvalOutcome.compositeThreshold,
    thresholdMet: blendedComposite >= fvalOutcome.compositeThreshold,
    signals: {
      wordCount: wordCount(input.data),
      hasHero: (counts.BrandHero ?? 0) > 0,
      hasCta: (counts.BrandCTA ?? 0) > 0,
      hasProof: (counts.Testimonial ?? 0) > 0
        || (counts.PricingTable ?? 0) > 0
        || (counts.FAQ ?? 0) > 0,
      components: counts,
    },
  };
}
