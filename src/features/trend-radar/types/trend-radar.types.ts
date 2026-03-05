// =============================================================
// Trend Radar Types
// =============================================================

// ─── Enums (mirrored from Prisma) ────────────────────────────

export type TrendSourceStatus = 'PENDING' | 'HEALTHY' | 'WARNING' | 'ERROR' | 'PAUSED';
export type TrendDetectionSource = 'AUTO_SCAN' | 'MANUAL' | 'AI_RESEARCH';
export type TrendScanStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type InsightCategory = 'CONSUMER_BEHAVIOR' | 'TECHNOLOGY' | 'MARKET_DYNAMICS' | 'COMPETITIVE' | 'REGULATORY';
export type InsightScope = 'MICRO' | 'MESO' | 'MACRO';
export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type InsightTimeframe = 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';

// ─── TrendSource ─────────────────────────────────────────────

export interface TrendSourceWithMeta {
  id: string;
  name: string;
  url: string;
  checkInterval: number;
  isActive: boolean;
  status: TrendSourceStatus;
  lastCheckedAt: string | null;
  lastContentHash: string | null;
  lastError: string | null;
  nextCheckAt: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  _count?: {
    detectedTrends: number;
  };
}

export interface CreateSourceBody {
  name: string;
  url: string;
  checkInterval?: number;
  category?: string;
}

export interface UpdateSourceBody {
  name?: string;
  url?: string;
  checkInterval?: number;
  category?: string;
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
  isActivated: boolean;
  activatedAt: string | null;
  isDismissed: boolean;
  dismissedAt: string | null;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  trendSourceId: string | null;
  trendSource?: {
    id: string;
    name: string;
    url: string;
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

// ─── TrendScanJob ────────────────────────────────────────────

export interface TrendScanJobWithMeta {
  id: string;
  status: TrendScanStatus;
  sourcesTotal: number;
  sourcesCompleted: number;
  trendsDetected: number;
  errors: string[];
  startedAt: string;
  completedAt: string | null;
  trendSourceId: string | null;
  workspaceId: string;
}

// ─── Scan Progress (in-memory) ───────────────────────────────

export interface ScanProgressResponse {
  jobId: string;
  status: TrendScanStatus;
  sourcesTotal: number;
  sourcesCompleted: number;
  trendsDetected: number;
  currentSourceName: string | null;
  errors: string[];
  progress?: number;
  startedAt?: string;
  completedAt?: string | null;
}

// ─── Dashboard Stats ─────────────────────────────────────────

export interface TrendRadarStats {
  total: number;
  activated: number;
  newThisWeek: number;
  sourcesHealthy: number;
}

// ─── API List Response ───────────────────────────────────────

export interface TrendListResponse {
  trends: DetectedTrendWithMeta[];
  total: number;
}

export interface SourceListResponse {
  sources: TrendSourceWithMeta[];
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

export interface SourceListParams {
  status?: TrendSourceStatus;
  search?: string;
}
