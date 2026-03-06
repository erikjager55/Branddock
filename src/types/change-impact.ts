/**
 * Change Impact Type Definitions
 * 
 * Tracks changes to brand assets and their impact on decisions,
 * campaigns, and personas without automatic updates.
 */

export type ChangeType = 'content-update' | 'research-added' | 'validation' | 'status-change';
export type ImpactLevel = 'none' | 'low' | 'medium' | 'high';

export interface AssetChange {
  id: string;
  assetId: string;
  assetTitle: string;
  changeType: ChangeType;
  timestamp: string;
  description: string;
  
  // What exactly changed
  fieldChanged?: string;
  oldValue?: any;
  newValue?: any;
  
  // Research impact
  researchAdded?: boolean;
  researchMethodType?: string;
  coverageChangeBefore?: number;
  coverageChangeAfter?: number;
}

export interface DecisionImpact {
  // Decision status changes
  decisionStatusChanged: boolean;
  previousStatus?: 'safe' | 'at-risk' | 'blocked';
  newStatus?: 'safe' | 'at-risk' | 'blocked';
  
  // Which decisions are affected
  affectedDecisions: string[];
  
  // Impact level
  impactLevel: ImpactLevel;
  
  // Human-readable summary
  summary: string;
}

export interface CampaignImpact {
  campaignId: string;
  campaignName: string;
  
  // Is there newer strategic input available?
  hasNewerInput: boolean;
  
  // Which assets are used in this campaign
  affectedAssets: string[];
  
  // Suggestion to recalculate
  recalculationSuggested: boolean;
  
  // Summary for the user
  summary: string;
}

export interface ImpactAnalysis {
  change: AssetChange;
  
  // Decision impact
  decisionImpact: DecisionImpact;
  
  // Campaign impacts (if applicable)
  campaignImpacts: CampaignImpact[];
  
  // Personas (NEVER automatically adjusted)
  affectedPersonas: string[];
  personaNote: string;
  
  // Research priorities (NEVER automatically adjusted)
  researchPriorityNote: string;
  
  // Timestamp
  analyzedAt: string;
}

export interface ChangeNotification {
  id: string;
  impactAnalysis: ImpactAnalysis;
  
  // Notification state
  seen: boolean;
  dismissed: boolean;
  acknowledgedAt?: string;
  
  // Where should this notification be shown
  showInDecisionStatus: boolean;
  showInCampaignGenerator: boolean;
}

/**
 * Change Impact Store
 * Keeps track of all changes and impacts for the platform
 */
export interface ChangeImpactStore {
  changes: AssetChange[];
  impactAnalyses: ImpactAnalysis[];
  notifications: ChangeNotification[];
  
  // Last analysis timestamp
  lastAnalyzedAt: string;
}
