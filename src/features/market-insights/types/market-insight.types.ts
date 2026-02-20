// Re-export existing types from centralized types
export type {
  InsightCategory,
  InsightScope,
  ImpactLevel,
  InsightTimeframe,
  InsightSource,
  InsightSourceUrl,
  InsightWithMeta,
  InsightDetailResponse as InsightDetail,
  InsightStats,
  InsightListParams,
  InsightListResponse,
  CreateInsightBody,
  UpdateInsightBody,
  AddInsightSourceBody,
} from "@/types/market-insight";

// ─── New types for S4 Sessie B ──────────────────────────────

export interface AiResearchBody {
  prompt: string;
  focusAreas?: string[];
  industries?: string[];
  timeframeFocus?: "short-term" | "all" | "long-term";
  numberOfInsights?: number;
  useBrandContext?: boolean;
}

export interface AiResearchJobResponse {
  jobId: string;
  status: "pending" | "researching" | "complete" | "failed";
  progress: number;
  insights?: import("@/types/market-insight").InsightWithMeta[];
  error?: string;
}

export interface ImportProvider {
  id: string;
  name: string;
  tier: "Enterprise" | "Custom";
  description: string;
  categories: string[];
  websiteUrl: string;
  isConnected: boolean;
}
