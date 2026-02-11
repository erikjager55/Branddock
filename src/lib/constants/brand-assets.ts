import { AssetType, AssetCategory } from "@/generated/prisma/client";

export const BRAND_ASSET_TYPES = {
  "social-relevancy": {
    name: "Social Relevancy",
    uiCategory: "Purpose",
    icon: "🌍",
    description:
      "How your brand contributes to society and addresses relevant social issues",
    dbType: "OTHER" as AssetType,
    dbCategory: "FOUNDATION" as AssetCategory,
  },
  "brand-tone-voice": {
    name: "Brand Tone & Voice",
    uiCategory: "Communication",
    icon: "🗣️",
    description:
      "The consistent voice and tone that defines how your brand communicates",
    dbType: "OTHER" as AssetType,
    dbCategory: "EXPRESSION" as AssetCategory,
  },
  "brand-promise": {
    name: "Brand Promise",
    uiCategory: "Strategy",
    icon: "🤝",
    description:
      "The commitment you make to your customers about what they can expect",
    dbType: "PROMISE" as AssetType,
    dbCategory: "STRATEGY" as AssetCategory,
  },
  "brand-story": {
    name: "Brand Story",
    uiCategory: "Narrative",
    icon: "📖",
    description:
      "The narrative that connects your brand's past, present, and future",
    dbType: "STORY" as AssetType,
    dbCategory: "EXPRESSION" as AssetCategory,
  },
  "brand-essence": {
    name: "Brand Essence",
    uiCategory: "Core",
    icon: "💎",
    description:
      "Two core traits that capture the heart and soul of your brand",
    dbType: "OTHER" as AssetType,
    dbCategory: "FOUNDATION" as AssetCategory,
  },
  "brand-personality": {
    name: "Brand Personality",
    uiCategory: "Personality",
    icon: "🎭",
    description:
      "The human characteristics and traits that define your brand's character",
    dbType: "OTHER" as AssetType,
    dbCategory: "IDENTITY" as AssetCategory,
  },
  "golden-circle": {
    name: "Golden Circle",
    uiCategory: "Foundation",
    icon: "⭕",
    description:
      "Define your Why, How, and What using Simon Sinek's framework",
    dbType: "OTHER" as AssetType,
    dbCategory: "FOUNDATION" as AssetCategory,
  },
  "vision-statement": {
    name: "Vision Statement",
    uiCategory: "Strategy",
    icon: "👁️",
    description:
      "A forward-looking declaration of your organization's purpose and aspirations",
    dbType: "VISION" as AssetType,
    dbCategory: "STRATEGY" as AssetCategory,
  },
  "mission-statement": {
    name: "Mission Statement",
    uiCategory: "Strategy",
    icon: "🎯",
    description:
      "What your organization does, how it does it, and for whom",
    dbType: "MISSION" as AssetType,
    dbCategory: "STRATEGY" as AssetCategory,
  },
  "brand-archetype": {
    name: "Brand Archetype",
    uiCategory: "Personality",
    icon: "🏛️",
    description:
      "Universal behavior patterns that define how your brand shows up",
    dbType: "OTHER" as AssetType,
    dbCategory: "IDENTITY" as AssetCategory,
  },
  "core-values": {
    name: "Core Values",
    uiCategory: "Culture",
    icon: "❤️",
    description:
      "The fundamental beliefs and principles that guide your organization",
    dbType: "VALUES" as AssetType,
    dbCategory: "FOUNDATION" as AssetCategory,
  },
  "transformative-goals": {
    name: "Transformative Goals",
    uiCategory: "Strategy",
    icon: "📈",
    description:
      "Ambitious goals that will transform your business and create lasting impact",
    dbType: "OTHER" as AssetType,
    dbCategory: "STRATEGY" as AssetCategory,
  },
  "brand-positioning": {
    name: "Brand Positioning",
    uiCategory: "Strategy",
    icon: "📍",
    description:
      "How your brand is uniquely positioned in the market relative to competitors",
    dbType: "POSITIONING" as AssetType,
    dbCategory: "STRATEGY" as AssetCategory,
  },
} as const;

export type BrandAssetTypeKey = keyof typeof BRAND_ASSET_TYPES;

export const UI_CATEGORIES = [
  "All Categories",
  "Purpose",
  "Communication",
  "Strategy",
  "Narrative",
  "Core",
  "Personality",
  "Foundation",
  "Culture",
] as const;

export type UICategory = (typeof UI_CATEGORIES)[number];

/**
 * Get the brand asset type info from either the content.assetTypeKey or the asset name.
 */
export function getBrandAssetTypeInfo(asset: {
  name: string;
  content?: unknown;
}) {
  // First try content.assetTypeKey
  const contentObj =
    asset.content && typeof asset.content === "object" && !Array.isArray(asset.content)
      ? (asset.content as Record<string, unknown>)
      : null;
  const contentKey = contentObj?.assetTypeKey as string | undefined;
  if (contentKey && contentKey in BRAND_ASSET_TYPES) {
    return BRAND_ASSET_TYPES[contentKey as BrandAssetTypeKey];
  }

  // Fall back to matching by name
  const normalizedName = asset.name.toLowerCase();
  for (const [, info] of Object.entries(BRAND_ASSET_TYPES)) {
    if (normalizedName.includes(info.name.toLowerCase())) {
      return info;
    }
  }

  return null;
}

/**
 * Get validation percentage based on research method completion counts.
 */
export function getValidationPercentage(counts: {
  aiAnalyses: number;
  workshops: number;
  interviews: number;
  questionnaires: number;
}): number {
  const total = 4;
  const completed =
    (counts.aiAnalyses > 0 ? 1 : 0) +
    (counts.workshops > 0 ? 1 : 0) +
    (counts.interviews > 0 ? 1 : 0) +
    (counts.questionnaires > 0 ? 1 : 0);
  return Math.round((completed / total) * 100);
}

/**
 * Get color class for validation percentage.
 */
export function getValidationColor(percentage: number): string {
  if (percentage === 0) return "text-red-500 bg-red-500/10";
  if (percentage < 50) return "text-orange-500 bg-orange-500/10";
  if (percentage < 75) return "text-yellow-500 bg-yellow-500/10";
  return "text-green-500 bg-green-500/10";
}
