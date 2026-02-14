// Decision Status Components
export { DecisionStatusBadge } from './DecisionStatusBadge';
export { CampaignDecisionHeader } from './CampaignDecisionHeader';
export { SectionDecisionIndicator } from './SectionDecisionIndicator';
export { DecisionSummaryPanel } from './DecisionSummaryPanel';
export { DecisionWarningModal } from './DecisionWarningModal';
export { PlatformDecisionSummary } from './PlatformDecisionSummary';
export { ResearchImpactIndicator } from './ResearchImpactIndicator';

// Decision Status Utilities
export { calculateDecisionStatus, getMethodLabel } from '../../utils/decision-status-calculator';
export { calculateCampaignDecision, calculateSectionDecision } from '../../utils/campaign-decision-calculator-v2';
export { 
  calculateDashboardDecision,
  calculateResearchHubDecision,
  calculateAssetDetailDecision,
  calculatePersonaDetailDecision,
  calculateCampaignOutputDecision,
  calculateRelationshipsDecision
} from '../../utils/platform-decision-aggregator';

// Decision Status Types
export type { DecisionStatus, DecisionStatusInfo, DecisionStatusConfig } from '../../types/decision-status';
export { DECISION_STATUS_CONFIG, RESEARCH_METHOD_RANKING } from '../../types/decision-status';