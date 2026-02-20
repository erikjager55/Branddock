// =============================================================
// Brand Alignment Types (Fase 8)
// =============================================================

export type ScanStatus = "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type AlignmentModule = "BRAND_FOUNDATION" | "BUSINESS_STRATEGY" | "BRANDSTYLE" | "PERSONAS" | "PRODUCTS_SERVICES" | "MARKET_INSIGHTS";
export type IssueSeverity = "CRITICAL" | "WARNING" | "SUGGESTION";
export type IssueStatus = "OPEN" | "DISMISSED" | "FIXED";

export interface ModuleScoreData {
  id: string;
  moduleName: AlignmentModule;
  score: number;
  alignedCount: number;
  reviewCount: number;
  misalignedCount: number;
  lastCheckedAt: string;
}

export interface ScanSummary {
  id: string;
  score: number;
  totalItems: number;
  alignedCount: number;
  reviewCount: number;
  misalignedCount: number;
  status: ScanStatus;
  startedAt: string;
  completedAt: string | null;
}

// GET /api/alignment response
export interface AlignmentOverviewResponse {
  hasScan: boolean;
  scan: ScanSummary | null;
  modules: ModuleScoreData[];
  openIssuesCount: number;
}

// GET /api/alignment/modules response
export interface AlignmentModulesResponse {
  scanId?: string;
  modules: ModuleScoreData[];
}

// GET /api/alignment/history response
export interface AlignmentHistoryResponse {
  scans: (ScanSummary & {
    issuesCount: number;
    modules: { moduleName: AlignmentModule; score: number }[];
  })[];
}

// POST /api/alignment/scan response
export interface StartScanResponse {
  scanId: string;
  status: 'RUNNING';
}

// GET /api/alignment/scan/:scanId response (progressive polling)
export interface ScanProgressResponse {
  scanId: string;
  status: ScanStatus;
  progress: number;              // 0-100
  currentStep: number;           // 0-7 (index of 8 steps)
  completedSteps: string[];
  score?: number;                // only when COMPLETED
  issuesFound?: number;
}

// POST /api/alignment/scan/:scanId/cancel response
export interface CancelScanResponse {
  scanId: string;
  status: 'CANCELLED';
}

// Alignment issue
export interface AlignmentIssueData {
  id: string;
  severity: IssueSeverity;
  title: string;
  modulePath: string;
  description: string;
  conflictsWith: string[];
  recommendation: string | null;
  status: IssueStatus;
  dismissedAt: string | null;
  dismissReason: string | null;
  fixAppliedAt: string | null;
  fixOption: string | null;
  sourceItemId: string | null;
  sourceItemType: string | null;
  targetItemId: string | null;
  targetItemType: string | null;
  scanId: string;
}

// GET /api/alignment/issues response
export interface AlignmentIssuesResponse {
  issues: AlignmentIssueData[];
  stats: {
    total: number;
    bySeverity: {
      critical: number;
      warning: number;
      suggestion: number;
    };
  };
}

// GET /api/alignment/issues/:id response
export interface AlignmentIssueDetailResponse extends AlignmentIssueData {
  scan: {
    id: string;
    score: number;
    status: ScanStatus;
    startedAt: string;
    completedAt: string | null;
  };
}

// Issue list params
export interface AlignmentIssueListParams {
  severity?: IssueSeverity;
  module?: string;
  status?: IssueStatus;
}

// Scan progress (polling response shape)
export interface ScanProgressResponse {
  scanId: string;
  status: ScanStatus;
  progress: number;
  currentStep: number;
  completedSteps: string[];
  score?: number;
  issuesFound?: number;
}

// POST /api/alignment/issues/:id/dismiss body
export interface DismissIssueBody {
  reason?: string;
}

// POST /api/alignment/issues/:id/dismiss response
export interface DismissIssueResponse {
  id: string;
  status: IssueStatus;
  dismissedAt: string | null;
  dismissReason: string | null;
}

// GET /api/alignment/issues/:id/fix-options response
export interface FixOptionsResponse {
  issueId: string;
  issueSummary: string;
  currentContent: {
    source: { label: string; content: string };
    target: { label: string; content: string };
  };
  options: FixOption[];
}

export interface FixOption {
  key: 'A' | 'B' | 'C';
  title: string;
  description: string;
  preview: string | null;
  affectedModule: AlignmentModule;
}

// POST /api/alignment/issues/:id/fix body + response
export interface ApplyFixBody {
  optionKey: 'A' | 'B' | 'C';
}

export interface ApplyFixResponse {
  success: boolean;
  issueId: string;
  newStatus: 'FIXED';
  updatedEntities: {
    type: string;
    id: string;
    field: string;
    oldValue: string;
    newValue: string;
  }[];
}

// Scan history item
export interface AlignmentHistoryItem {
  id: string;
  score: number;
  totalItems: number;
  alignedCount: number;
  reviewCount: number;
  misalignedCount: number;
  completedAt: string;
  issuesFound: number;
}
