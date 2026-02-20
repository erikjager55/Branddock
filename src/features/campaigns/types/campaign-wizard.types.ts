export type CampaignGoalType = "BRAND" | "PRODUCT" | "CONTENT" | "ENGAGEMENT";

export interface WizardKnowledgeCategory {
  category: string;
  items: WizardKnowledgeItem[];
}

export interface WizardKnowledgeItem {
  id: string;
  name: string;
  type: string;
  validationStatus: string | null;
}

export interface WizardKnowledgeResponse {
  categories: WizardKnowledgeCategory[];
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
  strategy: StrategyResultResponse;
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
