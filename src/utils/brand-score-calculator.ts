import { BrandAsset } from '../types/brand-asset';

export interface BrandScoreResult {
  overallScore: number;
  tier: 'foundation' | 'developing' | 'strong' | 'elite';
  dimensions: {
    foundation: number;
    strategy: number;
    confidence: number;
    coverage: number;
  };
}

export function calculateBrandScore(
  assets: BrandAsset[],
  unlockedAssetIds: string[]
): BrandScoreResult {
  // Filter to only unlocked assets
  const unlockedAssets = assets.filter(asset => unlockedAssetIds.includes(asset.id));

  if (unlockedAssets.length === 0) {
    return {
      overallScore: 0,
      tier: 'foundation',
      dimensions: {
        foundation: 0,
        strategy: 0,
        confidence: 0,
        coverage: 0,
      },
    };
  }

  // Calculate dimension scores
  const foundationAssets = unlockedAssets.filter(a => a.category === 'Foundation');
  const strategyAssets = unlockedAssets.filter(a => a.category === 'Strategy');

  const foundationScore = foundationAssets.length > 0
    ? foundationAssets.reduce((sum, a) => sum + a.researchCoverage, 0) / foundationAssets.length
    : 0;

  const strategyScore = strategyAssets.length > 0
    ? strategyAssets.reduce((sum, a) => sum + a.researchCoverage, 0) / strategyAssets.length
    : 0;

  const validatedCount = unlockedAssets.filter(a => a.status === 'validated').length;
  const confidenceScore = (validatedCount / unlockedAssets.length) * 100;

  const totalCoverage = unlockedAssets.reduce((sum, a) => sum + a.researchCoverage, 0);
  const coverageScore = totalCoverage / unlockedAssets.length;

  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    (foundationScore * 0.3) +
    (strategyScore * 0.25) +
    (confidenceScore * 0.25) +
    (coverageScore * 0.2)
  );

  // Determine tier
  let tier: 'foundation' | 'developing' | 'strong' | 'elite' = 'foundation';
  if (overallScore >= 76) tier = 'elite';
  else if (overallScore >= 51) tier = 'strong';
  else if (overallScore >= 26) tier = 'developing';

  return {
    overallScore,
    tier,
    dimensions: {
      foundation: Math.round(foundationScore),
      strategy: Math.round(strategyScore),
      confidence: Math.round(confidenceScore),
      coverage: Math.round(coverageScore),
    },
  };
}
