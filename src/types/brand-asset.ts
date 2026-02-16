export type AssetCategory =
  | "PURPOSE" | "COMMUNICATION" | "STRATEGY" | "NARRATIVE"
  | "CORE" | "PERSONALITY" | "FOUNDATION" | "CULTURE";

export type AssetStatus = "DRAFT" | "IN_PROGRESS" | "NEEDS_ATTENTION" | "READY";

// Calculated UI status (derived from research methods and content state)
export type CalculatedAssetStatus = "awaiting-research" | "in-development" | "ready-to-validate" | "validated";

// --- Research method types (gebruikt door mock data) ---
export type ResearchMethodType =
  | "ai-exploration"
  | "canvas-workshop"
  | "interviews"
  | "questionnaire"
  | "survey"
  | "focus-group"
  | "desk-research";

export type ResearchMethodStatus = "completed" | "in-progress" | "locked" | "not-started" | "available" | "running";

export interface ResearchMethod {
  type: ResearchMethodType;
  status: ResearchMethodStatus;
  completedAt?: string;
  progress?: number;
  metadata?: Record<string, unknown>;
}

// --- Core BrandAsset type (bron: mock-brand-assets.ts) ---
export interface BrandAsset {
  id: string;
  type: string;
  title: string;
  content: string;
  category: string;
  lastUpdated: string;
  status: string;
  description: string;
  isCritical?: boolean;
  priority?: string;
  researchMethods: ResearchMethod[];
  researchCoverage: number;
  artifactsGenerated: number;
  artifactsValidated: number;
  validatedAt?: string;
  validatedBy?: string;
  contentSections?: { title: string; content: string; completed: boolean }[];
  version?: string;
}

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

// --- BrandAssetOption (gebruikt in BrandAssetsViewSimple) ---
export interface BrandAssetOption {
  id: string;
  title: string;
  type: string;
  category: string;
  status: string;
}
