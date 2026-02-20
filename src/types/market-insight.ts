// =============================================================
// Market Insight Types (Fase 6)
// =============================================================

// Enums matching Prisma schema
export type InsightCategory = "TECHNOLOGY" | "ENVIRONMENTAL" | "SOCIAL" | "CONSUMER" | "BUSINESS";
export type InsightScope = "MICRO" | "MESO" | "MACRO";
export type ImpactLevel = "HIGH" | "MEDIUM" | "LOW";
export type InsightTimeframe = "SHORT_TERM" | "MEDIUM_TERM" | "LONG_TERM";
export type InsightSource = "MANUAL" | "AI_RESEARCH" | "IMPORTED";

// Source URL (child of MarketInsight)
export interface InsightSourceUrl {
  id: string;
  name: string;
  url: string;
}

// Insight as returned by GET /api/insights (list item)
export interface InsightWithMeta {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: InsightCategory;
  scope: InsightScope;
  impactLevel: ImpactLevel;
  timeframe: InsightTimeframe;
  relevanceScore: number;
  source: InsightSource;
  industries: string[];
  tags: string[];
  howToUse: string[];
  sourceUrls: InsightSourceUrl[];
  useBrandContext: boolean;
  createdAt: string;
  updatedAt: string;
}

// Insight detail as returned by GET /api/insights/:id
export interface InsightDetailResponse extends InsightWithMeta {
  aiResearchPrompt: string | null;
  aiResearchConfig: Record<string, unknown> | null;
}

// Stats as returned by GET /api/insights/stats and GET /api/insights
export interface InsightStats {
  active: number;
  highImpact: number;
  newThisMonth: number;
}

// GET /api/insights response
export interface InsightListResponse {
  insights: InsightWithMeta[];
  stats: InsightStats;
}

// Query params for GET /api/insights
export interface InsightListParams {
  category?: InsightCategory;
  impactLevel?: ImpactLevel;
  timeframe?: InsightTimeframe;
  search?: string;
}

// POST /api/insights body
export interface CreateInsightBody {
  title: string;
  description?: string;
  category: InsightCategory;
  scope?: InsightScope;
  impactLevel?: ImpactLevel;
  timeframe?: InsightTimeframe;
  relevanceScore?: number;
  source?: InsightSource;
  industries?: string[];
  tags?: string[];
  howToUse?: string[];
  aiResearchPrompt?: string;
  aiResearchConfig?: Record<string, unknown>;
  useBrandContext?: boolean;
  sourceUrls?: { name: string; url: string }[];
}

// PATCH /api/insights/:id body
export interface UpdateInsightBody {
  title?: string;
  description?: string | null;
  category?: InsightCategory;
  scope?: InsightScope;
  impactLevel?: ImpactLevel;
  timeframe?: InsightTimeframe;
  relevanceScore?: number;
  source?: InsightSource;
  industries?: string[];
  tags?: string[];
  howToUse?: string[];
  aiResearchPrompt?: string | null;
  aiResearchConfig?: Record<string, unknown> | null;
  useBrandContext?: boolean;
}

// POST /api/insights/:id/sources body
export interface AddInsightSourceBody {
  name: string;
  url: string;
}
