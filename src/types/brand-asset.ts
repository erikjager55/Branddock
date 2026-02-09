import {
  BrandAsset,
  AssetRelation,
  AIAnalysis,
  AssetType,
  AssetStatus,
  RelationType,
  AnalysisType,
} from "@/generated/prisma/client";

// Re-export enums and types
export { AssetType, AssetStatus, RelationType, AnalysisType };
export type { AIAnalysis, BrandAsset, AssetRelation };

// Extended types with relations
export type BrandAssetWithRelations = BrandAsset & {
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
  workspace: {
    id: string;
    name: string;
  };
  lockedBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  aiAnalyses?: AIAnalysis[];
  relatedFrom?: (AssetRelation & {
    toAsset: BrandAsset;
  })[];
  relatedTo?: (AssetRelation & {
    fromAsset: BrandAsset;
  })[];
};

// API request/response types
export interface CreateAssetRequest {
  name: string;
  description?: string;
  type: AssetType;
  status?: AssetStatus;
  content?: Record<string, unknown>;
  fileUrl?: string;
  workspaceId: string;
}

export interface UpdateAssetRequest {
  name?: string;
  description?: string;
  type?: AssetType;
  status?: AssetStatus;
  content?: Record<string, unknown>;
  fileUrl?: string;
  lockedById?: string | null;
}

export interface ListAssetsQuery {
  workspaceId: string;
  type?: AssetType;
  status?: AssetStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ListAssetsResponse {
  assets: BrandAssetWithRelations[];
  total: number;
  limit: number;
  offset: number;
}

export interface AssetDetailResponse extends BrandAssetWithRelations {
  relatedAssets: BrandAsset[];
}

// Content type definitions for brand strategy assets
export interface MissionContent {
  statement: string;
  purpose?: string;
  impact?: string;
}

export interface VisionContent {
  statement: string;
  timeframe?: string;
  aspirations?: string[];
}

export interface ValuesContent {
  values: {
    name: string;
    description: string;
  }[];
}

export interface PositioningContent {
  statement: string;
  targetAudience?: string;
  differentiator?: string;
  category?: string;
}

export interface PromiseContent {
  statement: string;
  proof_points?: string[];
}

export interface StoryContent {
  narrative: string;
  origin?: string;
  chapters?: {
    title: string;
    content: string;
  }[];
}

// AI Analysis content types
export interface BrandAlignmentAnalysis {
  score: number;
  strengths: string[];
  improvements: string[];
  consistency: {
    withOtherAssets: number;
    recommendations: string[];
  };
}

export interface AccessibilityAnalysis {
  wcagCompliance: "AA" | "AAA" | "None";
  issues: {
    severity: "high" | "medium" | "low";
    description: string;
    fix: string;
  }[];
  colorContrast?: {
    ratio: number;
    passes: boolean;
  };
}

export interface UsageRecommendation {
  bestPractices: string[];
  contexts: {
    context: string;
    recommendation: string;
  }[];
  donts: string[];
}

export interface TrendAnalysis {
  currentTrends: string[];
  alignment: number;
  futureConsiderations: string[];
}
