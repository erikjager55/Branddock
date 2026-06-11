// =============================================================================
// Campaign Blueprint Confidence Calculator
// Weighted scoring based on available context quality
// =============================================================================

interface ConfidenceInputs {
  /** Number of non-empty canonical brand assets (out of 12) */
  brandAssetCount: number;
  /** Number of personas in workspace */
  personaCount: number;
  /** Number of products in workspace */
  productCount: number;
  /** Number of competitors + activated trends */
  competitorAndTrendCount: number;
  /** Number of knowledge assets linked to campaign */
  knowledgeAssetCount: number;
}

interface ConfidenceResult {
  confidence: number;
  breakdown: Record<string, number>;
}

// The former personaValidation pillar (0.20) was removed 2026-06-11: no live
// prompt produces PersonaValidationResult anymore (the 3-variant
// persona-validator died with the CQP pipeline), so the pillar scored a
// permanent 0 and every blueprint lost 20 confidence points. Its weight is
// redistributed proportionally (×1.25) over the remaining pillars; the
// breakdown key is omitted entirely so UIs don't render a dead 0% pillar.
const WEIGHTS = {
  brandAssets: 0.3125,
  personas: 0.3125,
  products: 0.125,
  competitorsAndTrends: 0.125,
  knowledgeAssets: 0.125,
} as const;

const MAX_BRAND_ASSETS = 12;

/**
 * Calculate confidence score (0-100) for a campaign blueprint.
 * Higher scores indicate more context was available for AI generation.
 */
export function calculateBlueprintConfidence(inputs: ConfidenceInputs): ConfidenceResult {
  // Brand assets: proportion of 12 canonical assets that have content
  const brandAssetScore = Math.min(inputs.brandAssetCount / MAX_BRAND_ASSETS, 1) * 100;

  // Personas: 0 = 0%, 1 = 50%, 2 = 75%, 3+ = 100%
  let personaScore: number;
  if (inputs.personaCount === 0) personaScore = 0;
  else if (inputs.personaCount === 1) personaScore = 50;
  else if (inputs.personaCount === 2) personaScore = 75;
  else personaScore = 100;

  // Products: 0 = 0%, 1 = 50%, 2 = 75%, 3+ = 100%
  let productScore: number;
  if (inputs.productCount === 0) productScore = 0;
  else if (inputs.productCount === 1) productScore = 50;
  else if (inputs.productCount === 2) productScore = 75;
  else productScore = 100;

  // Competitors + trends: 0 = 0%, 1-2 = 50%, 3-5 = 75%, 6+ = 100%
  let ctScore: number;
  const ctCount = inputs.competitorAndTrendCount;
  if (ctCount === 0) ctScore = 0;
  else if (ctCount <= 2) ctScore = 50;
  else if (ctCount <= 5) ctScore = 75;
  else ctScore = 100;

  // Knowledge assets: 0 = 0%, 1-2 = 50%, 3-5 = 75%, 6+ = 100%
  let knowledgeScore: number;
  if (inputs.knowledgeAssetCount === 0) knowledgeScore = 0;
  else if (inputs.knowledgeAssetCount <= 2) knowledgeScore = 50;
  else if (inputs.knowledgeAssetCount <= 5) knowledgeScore = 75;
  else knowledgeScore = 100;

  const breakdown: Record<string, number> = {
    brandAssets: Math.round(brandAssetScore),
    personas: Math.round(personaScore),
    products: Math.round(productScore),
    competitorsAndTrends: Math.round(ctScore),
    knowledgeAssets: Math.round(knowledgeScore),
  };

  const confidence = Math.round(
    brandAssetScore * WEIGHTS.brandAssets +
    personaScore * WEIGHTS.personas +
    productScore * WEIGHTS.products +
    ctScore * WEIGHTS.competitorsAndTrends +
    knowledgeScore * WEIGHTS.knowledgeAssets
  );

  return { confidence: Math.min(confidence, 100), breakdown };
}
