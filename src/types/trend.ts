// =============================================================
// Trend types — Mock format (UI) + DB model + API contracts
// =============================================================

/** Mock-format Trend used by UI components and adapters */
export interface Trend {
  id: string;
  title: string;
  category: 'technology' | 'consumer' | 'social' | 'business' | 'environmental';
  description: string;
  impact: 'high' | 'medium' | 'low';
  timeframe: 'short-term' | 'medium-term' | 'long-term';
  relevantIndustries: string[];
  keyInsights?: string;
  direction?: 'rising' | 'declining' | 'stable';
  relevance?: number;
  sources?: string[];
  dateAdded?: string;
  tags?: string[];
  level?: 'micro' | 'meso' | 'macro';
}

/** DB-format Trend returned by API */
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
