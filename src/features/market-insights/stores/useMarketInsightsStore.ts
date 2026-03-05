// Re-export the existing Zustand store from the centralized location.
export {
  useMarketInsightsStore,
  useSearchQuery,
  useCategoryFilter,
  useImpactFilter,
  useTimeframeFilter,
  useIsAddModalOpen,
  useActiveAddTab,
  useSelectedInsightId,
} from "@/stores/useMarketInsightsStore";
