import type { CampaignBlueprint as CampaignBlueprintType } from '@/lib/campaigns/strategy-blueprint.types';

// Re-export blueprint types for convenience
export type {
  CampaignBlueprint,
  CampaignBriefing,
  StrategicIntent,
  PipelineStep,
  PipelineStepStatus,
  RegenerateLayer,
  GenerateBlueprintBody,
  RegenerateBlueprintBody,
  AssetPlanDeliverable,
  DeliverableBrief,
} from '@/lib/campaigns/strategy-blueprint.types';

export type CampaignGoalType =
  | "BRAND_AWARENESS" | "PRODUCT_LAUNCH" | "MARKET_EXPANSION" | "REBRANDING"
  | "CONTENT_MARKETING" | "AUDIENCE_ENGAGEMENT" | "COMMUNITY_BUILDING" | "LOYALTY_RETENTION"
  | "EMPLOYER_BRANDING" | "INTERNAL_BRANDING" | "THOUGHT_LEADERSHIP" | "CSR_IMPACT"
  | "LEAD_GENERATION" | "SALES_ACTIVATION" | "EVENT_SEASONAL"
  | "BRAND" | "PRODUCT" | "CONTENT" | "ENGAGEMENT"; // legacy

export interface WizardKnowledgeGroupItem {
  sourceType: string;
  sourceId: string;
  title: string;
  description?: string;
  status?: string;
}

export interface WizardKnowledgeGroup {
  key: string;
  label: string;
  icon: string;
  category: string;
  items: WizardKnowledgeGroupItem[];
}

export interface WizardKnowledgeResponse {
  groups: WizardKnowledgeGroup[];
}

export interface GenerateStrategyBody {
  campaignName: string;
  description: string;
  goalType: CampaignGoalType;
  knowledgeIds: string[];
  startDate?: string;
  endDate?: string;
}

export interface StrategyResultResponse {
  confidence: number;
  strategicApproach: string;
  keyMessages: string[];
  targetAudienceInsights: string;
  recommendedChannels: string[];
}

export interface DeliverableTypeOption {
  id: string;
  name: string;
  description: string;
  category: string;
  outputFormats: string[];
  icon: string;
}

export interface LaunchCampaignBody {
  name: string;
  description: string;
  goalType: CampaignGoalType;
  startDate?: string;
  endDate?: string;
  knowledgeIds: string[];
  strategy: StrategyResultResponse | CampaignBlueprintType;
  deliverables: { type: string; quantity: number }[];
  saveAsTemplate: boolean;
  templateName?: string;
}

export interface LaunchCampaignResponse {
  campaignId: string;
  campaignSlug: string;
  deliverableCount: number;
}

export interface CampaignTemplateItem {
  id: string;
  name: string;
  campaignGoalType: string | null;
  knowledgePattern: unknown;
  deliverableMix: unknown;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface EstimateTimelineResponse {
  estimatedDays: number;
  breakdown: { phase: string; days: number }[];
}

/** GET /api/campaigns/:id/strategy response for new blueprint format */
export interface BlueprintStrategyResponse {
  format: 'blueprint';
  blueprint: import('@/lib/campaigns/strategy-blueprint.types').CampaignBlueprint;
  confidence: number | null;
  generatedAt: string | null;
  personaCount: number;
}

/** GET /api/campaigns/:id/strategy response for legacy format */
export interface LegacyStrategyResponse {
  format: 'legacy';
  coreConcept: string | null;
  channelMix: unknown;
  targetAudience: string | null;
  generatedAt: string | null;
  confidence: number | null;
  strategicApproach: string | null;
  keyMessages: string[];
  recommendedChannels: string[];
  personaCount: number;
}

export type StrategyResponse = BlueprintStrategyResponse | LegacyStrategyResponse;
