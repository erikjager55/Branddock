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
  /** True when any content has been generated (text / images / video).
   *  Used to classify items without explicit IN_PROGRESS status as "in
   *  progress" — matches the user mental model of active work. */
  hasContent: boolean;
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

/** Traffic-light readiness buckets — matches deriveTrafficLight() output */
export type ReadinessLight = "red" | "amber" | "green";

/** Campaign type filter (matches Prisma CampaignType enum) */
export type CampaignTypeFilter = "STRATEGIC" | "QUICK" | "CONTENT";

/** Sort options */
export type ContentLibrarySort =
  | "updatedAt"
  | "-updatedAt"
  | "createdAt"
  | "-createdAt"
  | "title"
  | "-title"
  | "qualityScore"
  | "-qualityScore"
  | "scheduledPublishDate"
  | "-scheduledPublishDate"
  | "contentType"
  | "-contentType"
  | "campaignName"
  | "-campaignName";

export interface ContentLibraryFilters {
  /** Content types (slug ids, e.g. "blog-post", "linkedin-post") */
  types: string[];
  /** Campaign IDs */
  campaigns: string[];
  /** Campaign types */
  campaignTypes: CampaignTypeFilter[];
  /** Journey phases ("awareness", "consideration", "conversion", "retention") */
  phases: string[];
  /** Traffic-light readiness */
  readiness: ReadinessLight[];
  /** Scheduled date window */
  scheduledFrom: string | null; // ISO date (yyyy-mm-dd)
  scheduledTo: string | null;
  /** Minimum quality score (0-100) */
  qualityMin: number | null;
  /** Readiness-hint tokens ("no-content" / "not-reviewed" / "pipeline-incomplete") */
  readinessHints: string[];
}

export const EMPTY_FILTERS: ContentLibraryFilters = {
  types: [],
  campaigns: [],
  campaignTypes: [],
  phases: [],
  readiness: [],
  scheduledFrom: null,
  scheduledTo: null,
  qualityMin: null,
  readinessHints: [],
};

export interface ContentLibraryParams {
  /** Legacy single-type filter (kept for backward compat) */
  type?: string;
  campaignType?: string;
  status?: string;
  sort?: string;
  favorites?: boolean;
  groupByCampaign?: boolean;
  search?: string;
  /** Advanced filters */
  types?: string[];
  campaigns?: string[];
  campaignTypes?: string[];
  phases?: string[];
  readiness?: ReadinessLight[];
  scheduledFrom?: string;
  scheduledTo?: string;
  qualityMin?: number;
  readinessHints?: string[];
}
