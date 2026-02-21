// =============================================================
// Campaign types — S6 schema (DB + API contracts)
// =============================================================

// ─── Enums (match Prisma) ──────────────────────────────────

export type CampaignType = 'STRATEGIC' | 'QUICK';
export type CampaignStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type DeliverableStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

// ─── List / Overview ───────────────────────────────────────

export interface CampaignSummary {
  id: string;
  title: string;
  slug: string;
  type: CampaignType;
  status: CampaignStatus;
  confidence: number | null;
  campaignGoalType: string | null;
  description: string | null;
  contentType: string | null;
  contentCategory: string | null;
  qualityScore: number | null;
  isArchived: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  // Aggregated counts
  knowledgeAssetCount: number;
  deliverableCount: number;
  completedDeliverableCount: number;
  teamMemberCount: number;
}

export interface CampaignStatsResponse {
  active: number;
  quick: number;
  completed: number;
  totalContent: number;
}

export interface CampaignListResponse {
  campaigns: CampaignSummary[];
  stats: CampaignStatsResponse;
}

// ─── Detail ────────────────────────────────────────────────

export interface KnowledgeAssetResponse {
  id: string;
  assetName: string;
  assetType: string;
  validationStatus: string | null;
  isAutoSelected: boolean;
  brandAssetId: string | null;
  personaId: string | null;
  productId: string | null;
  insightId: string | null;
}

export interface DeliverableResponse {
  id: string;
  title: string;
  contentType: string;
  status: DeliverableStatus;
  progress: number;
  qualityScore: number | null;
  assignedTo: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberResponse {
  id: string;
  userId: string;
  role: string;
}

export interface CampaignDetail {
  id: string;
  title: string;
  slug: string;
  type: CampaignType;
  status: CampaignStatus;
  confidence: number | null;
  campaignGoalType: string | null;
  description: string | null;
  contentType: string | null;
  contentCategory: string | null;
  qualityScore: number | null;
  isArchived: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  // Strategic fields
  strategy: Record<string, unknown> | null;
  strategicApproach: string | null;
  keyMessages: string[];
  targetAudienceInsights: string | null;
  recommendedChannels: string[];
  strategyConfidence: number | null;
  strategyGeneratedAt: string | null;
  startDate: string | null;
  endDate: string | null;
  // Quick fields
  prompt: string | null;
  outputFormat: string | null;
  // Relations
  knowledgeAssets: KnowledgeAssetResponse[];
  deliverables: DeliverableResponse[];
  teamMembers: TeamMemberResponse[];
}

// ─── API Bodies ────────────────────────────────────────────

export interface CreateCampaignBody {
  title: string;
  type?: CampaignType;
  campaignGoalType?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateCampaignBody {
  title?: string;
  description?: string;
  status?: CampaignStatus;
  campaignGoalType?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateQuickContentBody {
  contentType: string;
  contentCategory: string;
  prompt: string;
  knowledgeAssetIds?: string[];
}

export interface ConvertToCampaignBody {
  campaignName: string;
}

export interface CreateDeliverableBody {
  title: string;
  contentType: string;
}

export interface UpdateDeliverableBody {
  title?: string;
  status?: DeliverableStatus;
  progress?: number;
  assignedTo?: string | null;
}

export interface AddKnowledgeAssetBody {
  assetName: string;
  assetType: string;
  brandAssetId?: string;
  personaId?: string;
  productId?: string;
  insightId?: string;
}

// ─── Knowledge Coverage ────────────────────────────────────

export interface CoverageResponse {
  coveragePercent: number;
  totalAssets: number;
  validatedAssets: number;
}

// ─── Strategy ──────────────────────────────────────────────

export interface StrategyResponse {
  coreConcept: string | null;
  channelMix: string | null;
  targetAudience: string | null;
  generatedAt: string | null;
  confidence: number | null;
  strategicApproach: string | null;
  keyMessages: string[];
  recommendedChannels: string[];
  personaCount?: number;
}

export interface PromptSuggestionsResponse {
  suggestions: string[];
}

// ─── Campaign List Params ──────────────────────────────────

export interface CampaignListParams {
  type?: CampaignType | 'all';
  status?: CampaignStatus | 'all';
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// =============================================================
// Legacy types — backward compat for existing CampaignsContext
// Will be removed after S6 integration (Prompt 6)
// =============================================================

/** @deprecated Use CampaignSummary or CampaignDetail */
export interface Campaign {
  id: string;
  name: string;
  type: 'campaign-strategy' | 'brand-refresh' | 'content-strategy';
  status: 'ready' | 'draft' | 'generating';
  objective?: string;
  budgetRange?: [number, number];
  channels?: {
    social?: boolean;
    email?: boolean;
    ooh?: boolean;
  };
  assets: CampaignAsset[];
  deliverables: CampaignDeliverable[];
  modifiedTime?: string;
  modifiedBy?: string;
}

/** @deprecated Use DeliverableResponse */
export interface CampaignDeliverable {
  id: string;
  name: string;
  description?: string;
  type: "document" | "image" | "video" | "email" | "website" | "social";
  status: "completed" | "in-progress" | "not-started";
  progress?: number;
  dueDate?: string;
  assignee?: string;
}

/** @deprecated Use KnowledgeAssetResponse */
export interface CampaignAsset {
  id: string;
  name: string;
  type: "brand" | "product" | "persona" | "trend" | "research";
  trustLevel: "high" | "medium" | "low";
  trustLabel: string;
  locked?: boolean;
}

/** @deprecated Use CampaignDetail */
export interface CampaignWithMeta {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  confidence: number | null;
  campaignGoalType: string | null;
  description: string | null;
  contentType: string | null;
  contentCategory: string | null;
  qualityScore: number | null;
  isArchived: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  name: string;
  objective: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  channels: { social?: boolean; email?: boolean; ooh?: boolean } | null;
  assets: CampaignAsset[];
  deliverables: CampaignDeliverable[];
  modifiedBy: string | null;
}
