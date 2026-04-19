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
  isLocked: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  /** Campaign start date (ISO timestamp); null when not yet scheduled */
  startDate: string | null;
  /** Campaign end date (ISO timestamp); null when open-ended */
  endDate: string | null;
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

/** Rich metadata stored in Deliverable.settings from the blueprint asset plan */
export interface DeliverableBriefSettings {
  channel?: string;
  phase?: string;
  targetPersonas?: string[];
  brief?: {
    objective?: string;
    keyMessage?: string;
    toneDirection?: string;
    callToAction?: string;
    contentOutline?: string[];
  };
  productionPriority?: 'must-have' | 'should-have' | 'nice-to-have';
  estimatedEffort?: 'low' | 'medium' | 'high';
  /** 1-based deployment order within phase, set by AI */
  suggestedOrder?: number;
  /** Type-specific inputs (SEO keywords, landing page URL, event details, etc.) */
  contentTypeInputs?: Record<string, string | string[] | number | boolean>;
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
  settings: DeliverableBriefSettings | null;
  approvalStatus: string;
  approvalNote: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  /** ISO timestamp when this deliverable is scheduled to publish; null when unscheduled */
  scheduledPublishDate: string | null;
  derivedFromId: string | null;
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
  isLocked: boolean;
  lockedAt: string | null;
  lockedBy: { id: string; name: string } | null;
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
  settings?: {
    phase?: string;
    channel?: string;
    targetPersonas?: string[];
    productionPriority?: 'must-have' | 'should-have' | 'nice-to-have';
    brief?: {
      objective?: string;
      keyMessage?: string;
      toneDirection?: string;
      callToAction?: string;
      contentOutline?: string[];
    };
  };
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

/** Legacy strategy response (pre-blueprint) */
export interface LegacyStrategyResponse {
  format?: 'legacy';
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

/** New blueprint strategy response */
export interface BlueprintStrategyResponse {
  format: 'blueprint';
  blueprint: import('@/lib/campaigns/strategy-blueprint.types').CampaignBlueprint;
  confidence: number | null;
  generatedAt: string | null;
  personaCount: number;
}

export type StrategyResponse = LegacyStrategyResponse | BlueprintStrategyResponse;

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


// ─── Bulk Generate Types ─────────────────────────────────

export interface BulkGenerateProgressEvent {
  deliverableId: string;
  title: string;
  status: 'generating' | 'complete' | 'error';
  message?: string;
  index: number;
  total: number;
}

export interface BulkGenerateCompleteEvent {
  generated: number;
  failed: number;
  total: number;
  duration: number;
}
