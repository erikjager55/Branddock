import { wordCount, componentTypeCounts, type PuckLikeData } from './puck-data-flatten';

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
