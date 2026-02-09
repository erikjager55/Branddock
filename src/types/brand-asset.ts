import {
  BrandAsset,
  AssetRelation,
  AIAnalysis,
  AssetType,
  AssetStatus,
  RelationType,
  AnalysisType,
} from "@/generated/prisma/client";

// Re-export enums
export { AssetType, AssetStatus, RelationType, AnalysisType };

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

// Content type definitions for different asset types
export interface LogoContent {
  variations: {
    id: string;
    name: string;
    url: string;
    format: "svg" | "png" | "jpg";
    usage: string[];
  }[];
}

export interface ColorContent {
  palette: {
    name: string;
    hex: string;
    rgb: { r: number; g: number; b: number };
    usage: string;
  }[];
}

export interface TypographyContent {
  fonts: {
    family: string;
    weights: number[];
    usage: "heading" | "body" | "accent";
    fallback: string[];
  }[];
}

export interface MessagingContent {
  tagline?: string;
  missionStatement?: string;
  valueProposition?: string;
  toneOfVoice?: string[];
}

export interface GuidelineContent {
  sections: {
    title: string;
    content: string;
    examples?: string[];
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
