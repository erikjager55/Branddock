// =============================================================
// Mock BrandAsset → BrandAssetWithMeta adapter
//
// Converts the legacy mock BrandAsset format (from context) to
// the API-format BrandAssetWithMeta used by new components.
//
// Temporary bridge until the context is migrated to BrandAssetWithMeta.
// =============================================================

import type { BrandAsset, BrandAssetWithMeta, AssetCategory, AssetStatus } from '@/types/brand-asset';

// ─── Reverse status mapping (mock → DB enum) ─────────────

const REVERSE_STATUS_MAP: Record<string, AssetStatus> = {
  'awaiting-research': 'DRAFT',
  'in-development': 'IN_PROGRESS',
  'ready-to-validate': 'NEEDS_ATTENTION',
  'validated': 'READY',
};

// ─── Reverse category mapping (display label → DB enum) ──

const REVERSE_CATEGORY_MAP: Record<string, AssetCategory> = {
  'Purpose': 'PURPOSE',
  'Communication': 'COMMUNICATION',
  'Strategy': 'STRATEGY',
  'Narrative': 'NARRATIVE',
  'Core': 'CORE',
  'Personality': 'PERSONALITY',
  'Foundation': 'FOUNDATION',
  'Culture': 'CULTURE',
};

// ─── Converter ───────────────────────────────────────────

export function mockToMeta(asset: BrandAsset): BrandAssetWithMeta {
  const category: AssetCategory =
    REVERSE_CATEGORY_MAP[asset.category] ??
    (asset.category.toUpperCase() as AssetCategory);

  const status: AssetStatus =
    REVERSE_STATUS_MAP[asset.status] ??
    (asset.status.toUpperCase().replace(/\s+/g, '_') as AssetStatus);

  // Derive validation methods from research methods
  const methods = asset.researchMethods ?? [];
  const aiDone = methods.some((m) => m.type === 'ai-exploration' && m.status === 'completed');
  const workshopDone = methods.some((m) => m.type === 'canvas-workshop' && m.status === 'completed');
  const interviewDone = methods.some((m) => m.type === 'interviews' && m.status === 'completed');
  const questionnaireDone = methods.some((m) => m.type === 'questionnaire' && m.status === 'completed');

  return {
    id: asset.id,
    name: asset.title || asset.type,
    slug: (asset.title || asset.type).toLowerCase().replace(/\s+/g, '-'),
    description: asset.description || '',
    category,
    status,
    coveragePercentage: asset.researchCoverage ?? 0,
    validatedCount: asset.artifactsValidated ?? 0,
    artifactCount: asset.artifactsGenerated ?? 0,
    frameworkType: null,
    frameworkData: null,
    validationMethods: {
      ai: aiDone,
      workshop: workshopDone,
      interview: interviewDone,
      questionnaire: questionnaireDone,
    },
    updatedAt: asset.lastUpdated || new Date().toISOString(),
  };
}

export function mockListToMeta(assets: BrandAsset[]): BrandAssetWithMeta[] {
  return assets.map(mockToMeta);
}
