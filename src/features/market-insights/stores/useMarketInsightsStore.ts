// Re-export the existing Zustand store from the centralized location.
// The store already has the correct shape for S4 Sessie B.
export {
  useMarketInsightsStore,
  useSearchQuery,
  useCategoryFilter,
  useImpactFilter,
  useTimeframeFilter,
  useIsAddModalOpen,
  useActiveAddTab,
  useAiResearchJobId,
  useIsResearching,
  useSelectedInsightId,
} from "@/stores/useMarketInsightsStore";
