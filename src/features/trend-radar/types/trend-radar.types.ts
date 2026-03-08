// =============================================================
// Trend Radar Types
// =============================================================

// ─── Enums (mirrored from Prisma) ────────────────────────────

export type TrendDetectionSource = 'MANUAL' | 'AI_RESEARCH';
export type TrendScanStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type InsightCategory = 'CONSUMER_BEHAVIOR' | 'TECHNOLOGY' | 'MARKET_DYNAMICS' | 'COMPETITIVE' | 'REGULATORY';
export type InsightScope = 'MICRO' | 'MESO' | 'MACRO';
export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type InsightTimeframe = 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
export type ResearchPhase =
  | 'generating_queries'
  | 'discovering_sources'
  | 'extracting_signals'
  | 'synthesizing'
  | 'validating'
  | 'complete'
  | 'failed'
  | 'cancelled';

// ─── Trend Quality Scores ───────────────────────────────────

export interface TrendScores {
  novelty: number;
  evidenceStrength: number;
  growthSignal: number;
  actionability: number;
  strategicRelevance: number;
  compositeScore: number;
}

// ─── DetectedTrend ───────────────────────────────────────────

export interface DetectedTrendWithMeta {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: InsightCategory;
  scope: InsightScope;
  impactLevel: ImpactLevel;
  timeframe: InsightTimeframe;
  relevanceScore: number;
  direction: string | null;
  confidence: number | null;
  rawExcerpt: string | null;
  aiAnalysis: string | null;
  industries: string[];
  tags: string[];
  howToUse: string[];
  detectionSource: TrendDetectionSource;
  sourceUrl: string | null;
  isLocked: boolean;
  lockedAt: string | null;
  lockedBy?: { id: string; name: string } | null;
  isActivated: boolean;
  activatedAt: string | null;
  isDismissed: boolean;
  dismissedAt: string | null;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  researchJobId: string | null;
  researchJob?: {
    id: string;
    query: string;
  } | null;
  activatedBy?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateManualTrendBody {
  title: string;
  description?: string;
  category?: InsightCategory;
  scope?: InsightScope;
  impactLevel?: ImpactLevel;
  timeframe?: InsightTimeframe;
  relevanceScore?: number;
  industries?: string[];
  tags?: string[];
  howToUse?: string[];
  sourceUrl?: string;
}

export interface UpdateTrendBody {
  title?: string;
  description?: string;
  category?: InsightCategory;
  scope?: InsightScope;
  impactLevel?: ImpactLevel;
  timeframe?: InsightTimeframe;
  relevanceScore?: number;
  direction?: string;
  industries?: string[];
  tags?: string[];
  howToUse?: string[];
}

// ─── Research Job ────────────────────────────────────────────

export interface StartResearchBody {
  query: string;
  useBrandContext?: boolean;
}

export interface TrendResearchJobResponse {
  id: string;
  status: TrendScanStatus;
  query: string;
  useBrandContext: boolean;
  workspaceId: string;
}

// ─── Research Progress (in-memory) ──────────────────────────

export interface PendingTrendItem {
  title: string;
  description: string;
  category: string;
  impactLevel: string;
  relevanceScore: number;
  sourceUrl: string;
  tags: string[];
  dataPoints?: string[];
  evidenceCount?: number;
  sourceUrls?: string[];
  scores?: TrendScores;
}

export interface ResearchProgressResponse {
  jobId: string;
  status: TrendScanStatus | 'CANCELLED';
  phase: ResearchPhase;
  urlsTotal: number;
  urlsCompleted: number;
  currentUrl: string | null;
  trendsDetected: number;
  trendsRejected: number;
  queriesGenerated: number;
  signalsExtracted: number;
  sourcesProcessed: number;
  sourcesTotal: number;
  pendingTrends?: PendingTrendItem[];
  errors: string[];
  progress: number;
  startedAt?: string;
  completedAt?: string | null;
}

// ─── Dashboard Stats ─────────────────────────────────────────

export interface TrendRadarStats {
  total: number;
  activated: number;
  newThisWeek: number;
  aiResearched: number;
}

// ─── API List Response ───────────────────────────────────────

export interface TrendListResponse {
  trends: DetectedTrendWithMeta[];
  total: number;
}

// ─── Filter Params ───────────────────────────────────────────

export interface TrendListParams {
  category?: InsightCategory;
  impactLevel?: ImpactLevel;
  activated?: boolean;
  dismissed?: boolean;
  detectionSource?: TrendDetectionSource;
  search?: string;
}
