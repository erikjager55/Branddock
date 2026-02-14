/**
 * Change Impact Type Definitions
 * 
 * Tracks wijzigingen aan brand assets en hun impact op beslissingen,
 * campagnes, en persona's zonder automatische updates.
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
  
  // Wat is er precies veranderd
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
  // Decision status wijzigingen
  decisionStatusChanged: boolean;
  previousStatus?: 'safe' | 'at-risk' | 'blocked';
  newStatus?: 'safe' | 'at-risk' | 'blocked';
  
  // Welke beslissingen worden beïnvloed
  affectedDecisions: string[];
  
  // Impact niveau
  impactLevel: ImpactLevel;
  
  // Menselijke taal samenvatting
  summary: string;
}

export interface CampaignImpact {
  campaignId: string;
  campaignName: string;
  
  // Is er nieuwere strategische input beschikbaar?
  hasNewerInput: boolean;
  
  // Welke assets worden gebruikt in deze campagne
  affectedAssets: string[];
  
  // Suggestie om te herberekenen
  recalculationSuggested: boolean;
  
  // Samenvatting voor gebruiker
  summary: string;
}

export interface ImpactAnalysis {
  change: AssetChange;
  
  // Decision impact
  decisionImpact: DecisionImpact;
  
  // Campaign impacts (indien van toepassing)
  campaignImpacts: CampaignImpact[];
  
  // Persona's (NOOIT automatisch aangepast)
  affectedPersonas: string[];
  personaNote: string;
  
  // Research prioriteiten (NOOIT automatisch aangepast)
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
  
  // Waar moet deze notificatie getoond worden
  showInDecisionStatus: boolean;
  showInCampaignGenerator: boolean;
}

/**
 * Change Impact Store
 * Houdt alle wijzigingen en impacts bij voor het platform
 */
export interface ChangeImpactStore {
  changes: AssetChange[];
  impactAnalyses: ImpactAnalysis[];
  notifications: ChangeNotification[];
  
  // Last analysis timestamp
  lastAnalyzedAt: string;
}
