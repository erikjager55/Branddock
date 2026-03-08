// =============================================================
// Trend Scorer — Multi-dimensional quality scoring
//
// Phase 4 of the trend research pipeline.
// Scores each candidate trend on 5 dimensions:
//   - Novelty (AI-scored in Phase 5)
//   - Evidence Strength (calculated from signal data)
//   - Growth Signal (AI-scored in Phase 5)
//   - Actionability (calculated from howToUse quality)
//   - Strategic Relevance (AI-scored in Phase 5)
//
// Evidence and Actionability are computed deterministically.
// Novelty, Growth, and Relevance are scored by the Judge (Phase 5).
// =============================================================

import type { SanitizedTrend } from './trend-analyzer';

export interface TrendScores {
  novelty: number;            // 0-100: AI-scored by judge
  evidenceStrength: number;   // 0-100: calculated from evidence count + diversity
  growthSignal: number;       // 0-100: AI-scored by judge
  actionability: number;      // 0-100: calculated from howToUse quality
  strategicRelevance: number; // 0-100: AI-scored by judge
  compositeScore: number;     // Weighted average
}

export const SCORE_WEIGHTS = {
  novelty: 0.20,
  evidenceStrength: 0.25,
  growthSignal: 0.15,
  actionability: 0.25,
  strategicRelevance: 0.15,
} as const;

export const QUALITY_THRESHOLD = 55;

/**
 * Calculate evidence strength score from trend metadata.
 * Fully deterministic — no AI needed.
 */
export function calculateEvidenceStrength(trend: SanitizedTrend): number {
  let score = 30; // base score

  // +15 per independent source (max 3 × 15 = 45)
  const sourceCount = Math.min(trend.evidenceCount, 3);
  score += sourceCount * 15;

  // +5 per unique source type from URLs (max 3 × 5 = 15)
  const uniqueDomains = new Set<string>();
  for (const url of trend.sourceUrls) {
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '');
      uniqueDomains.add(domain);
    } catch {
      // skip invalid URLs
    }
  }
  score += Math.min(uniqueDomains.size, 3) * 5;

  // +10 if at least one data point exists
  if (trend.dataPoints.length > 0) {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * Calculate actionability score from howToUse recommendations.
 * Fully deterministic — no AI needed.
 */
export function calculateActionability(trend: SanitizedTrend): number {
  let score = 0;

  // +20 per specific howToUse recommendation (max 3 × 20 = 60)
  const validRecommendations = trend.howToUse.filter((h) => h.trim().length > 20);
  score += Math.min(validRecommendations.length, 3) * 20;

  // +15 if recommendations contain concrete action verbs (not vague)
  const vaguePatterns = /\b(monitor|stay informed|keep an eye|watch|be aware|consider exploring)\b/i;
  const hasConcreteActions = validRecommendations.some((h) => !vaguePatterns.test(h));
  if (hasConcreteActions) {
    score += 15;
  }

  // +25 if timeframe is SHORT_TERM or MEDIUM_TERM (actionable timeframe)
  if (trend.timeframe === 'SHORT_TERM' || trend.timeframe === 'MEDIUM_TERM') {
    score += 25;
  }

  return Math.min(100, score);
}

/**
 * Calculate partial scores for a trend (evidence + actionability only).
 * Novelty, growthSignal, and strategicRelevance default to 50 until the judge scores them.
 */
export function calculatePartialScores(trend: SanitizedTrend): TrendScores {
  const evidenceStrength = calculateEvidenceStrength(trend);
  const actionability = calculateActionability(trend);

  // Defaults for AI-scored dimensions (replaced by judge in Phase 5)
  const novelty = 50;
  const growthSignal = 50;
  const strategicRelevance = 50;

  const compositeScore = Math.round(
    novelty * SCORE_WEIGHTS.novelty +
    evidenceStrength * SCORE_WEIGHTS.evidenceStrength +
    growthSignal * SCORE_WEIGHTS.growthSignal +
    actionability * SCORE_WEIGHTS.actionability +
    strategicRelevance * SCORE_WEIGHTS.strategicRelevance,
  );

  return { novelty, evidenceStrength, growthSignal, actionability, strategicRelevance, compositeScore };
}

/**
 * Calculate final composite score with all 5 dimensions.
 */
export function calculateCompositeScore(scores: Omit<TrendScores, 'compositeScore'>): number {
  return Math.round(
    scores.novelty * SCORE_WEIGHTS.novelty +
    scores.evidenceStrength * SCORE_WEIGHTS.evidenceStrength +
    scores.growthSignal * SCORE_WEIGHTS.growthSignal +
    scores.actionability * SCORE_WEIGHTS.actionability +
    scores.strategicRelevance * SCORE_WEIGHTS.strategicRelevance,
  );
}

/**
 * Filter trends below the quality threshold.
 * Returns only trends with composite score >= QUALITY_THRESHOLD.
 */
export function filterByQuality(
  trends: Array<SanitizedTrend & { scores: TrendScores }>,
): Array<SanitizedTrend & { scores: TrendScores }> {
  return trends.filter((t) => t.scores.compositeScore >= QUALITY_THRESHOLD);
}
