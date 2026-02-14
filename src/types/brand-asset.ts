export type AssetCategory =
  | "PURPOSE" | "COMMUNICATION" | "STRATEGY" | "NARRATIVE"
  | "CORE" | "PERSONALITY" | "FOUNDATION" | "CULTURE";

export type AssetStatus = "DRAFT" | "IN_PROGRESS" | "NEEDS_ATTENTION" | "READY";

export interface BrandAssetWithMeta {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: AssetCategory;
  status: AssetStatus;
  coveragePercentage: number;
  validatedCount: number;
  artifactCount: number;
  validationMethods: {
    ai: boolean;
    workshop: boolean;
    interview: boolean;
    questionnaire: boolean;
  };
  updatedAt: string;
}

export interface BrandAssetListParams {
  category?: AssetCategory;
  search?: string;
  status?: AssetStatus;
  sortBy?: "name" | "updatedAt" | "coveragePercentage";
  sortOrder?: "asc" | "desc";
}

export interface BrandAssetListResponse {
  assets: BrandAssetWithMeta[];
  stats: SummaryStats;
}

export interface SummaryStats {
  ready: number;
  needValidation: number;
  total: number;
}

export interface CreateBrandAssetBody {
  name: string;
  category: AssetCategory;
  description?: string;
}

// UI mapping: DB category enum → UI group labels
export const CATEGORY_MAP: Record<string, AssetCategory[]> = {
  "All Categories": [],
  "Purpose":        ["PURPOSE"],
  "Communication":  ["COMMUNICATION"],
  "Strategy":       ["STRATEGY"],
  "Narrative":      ["NARRATIVE"],
  "Core":           ["CORE"],
  "Personality":    ["PERSONALITY"],
  "Foundation":     ["FOUNDATION"],
  "Culture":        ["CULTURE"],
};
