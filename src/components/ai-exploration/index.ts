// ─── AI Exploration Module — Public API ─────────────────────

// Components
export { AIExplorationPage } from './AIExplorationPage';
export { AIExplorationChatInterface } from './AIExplorationChatInterface';
export { AIExplorationReport } from './AIExplorationReport';
export { AIExplorationSuggestions } from './AIExplorationSuggestions';
export { AIExplorationFieldSuggestion } from './AIExplorationFieldSuggestion';
export { AIExplorationDimensionCard } from './AIExplorationDimensionCard';

// Store
export { useAIExplorationStore } from './hooks/useAIExplorationStore';

// Types
export type {
  ExplorationConfig,
  ExplorationStatus,
  ExplorationMessage,
  ExplorationMessageType,
  ExplorationSession,
  ExplorationInsightsData,
  DimensionConfig,
  DimensionInsight,
  FieldMapping,
  FieldSuggestion,
  FieldSuggestionStatus,
  ReportFinding,
  StartExplorationResponse,
  SendAnswerResponse,
  CompleteExplorationResponse,
} from './types';
