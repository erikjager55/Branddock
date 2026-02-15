export interface TrendWithMeta {
  id: string;
  title: string;
  description: string;
  category: string;
  impact: string;
  timeframe: string;
  direction: string | null;
  level: string | null;
  relevance: number | null;
  relevantIndustries: string[];
  keyInsights: string | null;
  sources: string[] | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TrendListResponse {
  trends: TrendWithMeta[];
  stats: {
    total: number;
    byCategory: Record<string, number>;
    byImpact: Record<string, number>;
  };
}

export interface TrendListParams {
  category?: string;
  impact?: string;
  timeframe?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateTrendBody {
  title: string;
  description?: string;
  category?: string;
  impact?: string;
  timeframe?: string;
  direction?: string;
  level?: string;
  relevance?: number;
  relevantIndustries?: string[];
  keyInsights?: string;
  sources?: string[];
  tags?: string[];
}
