import { wordCount, componentTypeCounts, flattenPuckText, type PuckLikeData } from './puck-data-flatten';
import type { CanvasContextStack } from '../ai/canvas-context';

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
 *   1. flattenPuckText → contentText for the judge
 *   2. runFidelityScoring (3-pillar composite) via injected runner
 *   3. Map FidelityRunOutcome → PageQualityResult shape so callers stay
 *      identical to the heuristic stub
 *
 * Fallback: when the runner returns null (word count < 50, missing brand
 * personality, etc.) we fall back to the heuristic stub so the route never
 * crashes — same defense-in-depth pattern as the spike auto-iterate flow.
 */
export async function evaluatePageQualityViaFVAL(
  input: FvalEvaluatorInputs,
): Promise<PageQualityResult> {
  const contentText = flattenPuckText(input.data);
  const fvalOutcome = await input.runFVal({
    workspaceId: input.workspaceId,
    deliverableId: input.deliverableId,
    contentTypeId: input.contentTypeId,
    contentText,
    stack: input.ctx,
  });

  if (!fvalOutcome) {
    return evaluatePageQuality(input.data);
  }

  // Dimensie 8 — vision-judge blend (DTS-plan F-VAL integratie). Optional;
  // non-blocking. Bij failure logt warning + valt terug op pure F-VAL.
  let blendedComposite = fvalOutcome.composite;
  if (input.visionJudge?.designPhilosophy && input.visionJudge.designPhilosophy.trim().length > 0) {
    try {
      const { judgeVisualBrandFit } = await import("./visual-brand-fit-judge");
      const vbf = await judgeVisualBrandFit({
        puckData: input.data as unknown as import("@puckeditor/core").Data,
        ctx: input.ctx,
        designPhilosophy: input.visionJudge.designPhilosophy,
        brandName: input.visionJudge.brandName,
        brandColors: input.visionJudge.brandColors,
        brandImageryStyle: input.visionJudge.brandImageryStyle,
      });
      if (vbf.status === "scored" && vbf.score !== null) {
        // Blend: F-VAL composite weegt 90%, vision-fit 10%
        blendedComposite = fvalOutcome.composite * 0.9 + vbf.score * 0.1;
        console.log(
          `[page-quality] Vision blend: F-VAL ${fvalOutcome.composite} + vision ${vbf.score} → ${Math.round(blendedComposite)}`,
        );
      } else if (vbf.status !== "scored") {
        console.warn(`[page-quality] Vision judge ${vbf.status}: ${vbf.reasoning ?? "n/a"}`);
      }
    } catch (err) {
      console.warn(
        `[page-quality] Vision judge unexpected error (non-critical): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

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
