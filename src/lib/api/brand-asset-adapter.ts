import type { BrandAsset } from "@/types/brand-asset";
import type { BrandAssetWithMeta } from "@/types/brand-asset";

const STATUS_MAP: Record<string, string> = {
  DRAFT: "awaiting-research",
  IN_PROGRESS: "in-development",
  NEEDS_ATTENTION: "ready-to-validate",
  READY: "validated",
};

const CATEGORY_LABEL_MAP: Record<string, string> = {
  PURPOSE: "Purpose",
  COMMUNICATION: "Communication",
  STRATEGY: "Strategy",
  NARRATIVE: "Narrative",
  CORE: "Core",
  PERSONALITY: "Personality",
  FOUNDATION: "Foundation",
  CULTURE: "Culture",
};

export function apiAssetToMockFormat(asset: BrandAssetWithMeta): BrandAsset {
  const researchMethods: BrandAsset["researchMethods"] = [
    {
      type: "ai-exploration",
      status: asset.validationMethods.ai ? "completed" : "not-started",
      ...(asset.validationMethods.ai ? { completedAt: asset.updatedAt } : {}),
      metadata: {},
    },
    {
      type: "canvas-workshop",
      status: asset.validationMethods.workshop ? "completed" : "not-started",
      ...(asset.validationMethods.workshop ? { completedAt: asset.updatedAt } : {}),
      metadata: {},
    },
    {
      type: "interviews",
      status: asset.validationMethods.interview ? "completed" : "not-started",
      ...(asset.validationMethods.interview ? { completedAt: asset.updatedAt } : {}),
      metadata: {},
    },
    {
      type: "questionnaire",
      status: asset.validationMethods.questionnaire ? "completed" : "not-started",
      ...(asset.validationMethods.questionnaire ? { completedAt: asset.updatedAt } : {}),
      metadata: {},
    },
  ];

  return {
    id: asset.id,
    type: asset.name,
    title: asset.name,
    content: "",
    category: CATEGORY_LABEL_MAP[asset.category] ?? asset.category,
    lastUpdated: asset.updatedAt,
    status: STATUS_MAP[asset.status] ?? "awaiting-research",
    description: asset.description,
    isCritical: asset.status === "READY" || asset.coveragePercentage >= 70,
    researchMethods,
    researchCoverage: asset.coveragePercentage,
    artifactsGenerated: asset.artifactCount,
    artifactsValidated: asset.validatedCount,
  };
}

export function apiAssetsToMockFormat(assets: BrandAssetWithMeta[]): BrandAsset[] {
  return assets.map(apiAssetToMockFormat);
}
