// =============================================================
// Readiness Calculator (S8)
// =============================================================

interface ReadinessInput {
  brandAssets: number;
  researchStudies: number;
  personas: number;
  products: number;
  marketInsights: number;
}

/**
 * Calculate decision readiness percentage based on module completeness.
 * Weights: Brand Assets 30%, Research 20%, Personas 20%, Products 15%, Insights 15%
 */
export function calculateReadiness(stats: ReadinessInput): number {
  const weights = {
    brandAssets: 0.30,
    researchStudies: 0.20,
    personas: 0.20,
    products: 0.15,
    marketInsights: 0.15,
  };

  // Each module contributes based on whether it has content
  const scores = {
    brandAssets: stats.brandAssets > 0 ? Math.min(100, stats.brandAssets * 10) : 0,
    researchStudies: stats.researchStudies > 0 ? Math.min(100, stats.researchStudies * 25) : 0,
    personas: stats.personas > 0 ? Math.min(100, stats.personas * 33) : 0,
    products: stats.products > 0 ? Math.min(100, stats.products * 33) : 0,
    marketInsights: stats.marketInsights > 0 ? Math.min(100, stats.marketInsights * 15) : 0,
  };

  const weighted =
    scores.brandAssets * weights.brandAssets +
    scores.researchStudies * weights.researchStudies +
    scores.personas * weights.personas +
    scores.products * weights.products +
    scores.marketInsights * weights.marketInsights;

  return Math.round(Math.min(100, Math.max(0, weighted)));
}
