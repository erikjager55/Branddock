export interface ContentLibraryItem {
  id: string;
  title: string;
  type: string;
  typeCategory: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  qualityScore: number | null;
  campaignId: string;
  campaignName: string;
  campaignType: "STRATEGIC" | "QUICK";
  isFavorite: boolean;
  wordCount: number | null;
  updatedAt: string;
  /** User-set publish date (ISO timestamp); null when not yet scheduled */
  scheduledPublishDate: string | null;
  /** AI-suggested publish date (ISO timestamp); fallback for unscheduled items */
  suggestedPublishDate: string | null;
  /** Actual publish timestamp (ISO); set after publication completes */
  publishedAt: string | null;
  /** True when content is generated + approved — ready for publishing */
  isPublishReady: boolean;
  /** Human-readable hint about what's missing (null when publish-ready) */
  readinessHint: string | null;
  /** Journey phase (e.g. "awareness", "consideration", "conversion") */
  phase: string | null;
}

export interface ContentLibraryStatsResponse {
  totalContent: number;
  complete: number;
  inProgress: number;
  avgQuality: number;
}

export interface ContentLibraryParams {
  type?: string;
  campaignType?: string;
  status?: string;
  sort?: string;
  favorites?: boolean;
  groupByCampaign?: boolean;
  search?: string;
}
