import { create } from "zustand";
import type {
  InsightCategory,
  ImpactLevel,
  InsightTimeframe,
} from "@/types/market-insight";

type AddTab = "ai-research" | "manual" | "import";

interface MarketInsightsStore {
  // Filters
  searchQuery: string;
  categoryFilter: InsightCategory | null;
  impactFilter: ImpactLevel | null;
  timeframeFilter: InsightTimeframe | null;

  // Add Modal
  isAddModalOpen: boolean;
  activeAddTab: AddTab;

  // Detail
  selectedInsightId: string | null;

  // Actions
  setSearchQuery: (q: string) => void;
  setCategoryFilter: (c: InsightCategory | null) => void;
  setImpactFilter: (i: ImpactLevel | null) => void;
  setTimeframeFilter: (t: InsightTimeframe | null) => void;
  setAddModalOpen: (open: boolean) => void;
  setActiveAddTab: (tab: AddTab) => void;
  setSelectedInsightId: (id: string | null) => void;
  resetFilters: () => void;
}

export const useMarketInsightsStore = create<MarketInsightsStore>((set) => ({
  searchQuery: "",
  categoryFilter: null,
  impactFilter: null,
  timeframeFilter: null,

  isAddModalOpen: false,
  activeAddTab: "ai-research",

  selectedInsightId: null,

  setSearchQuery: (q) => set({ searchQuery: q }),
  setCategoryFilter: (c) => set({ categoryFilter: c }),
  setImpactFilter: (i) => set({ impactFilter: i }),
  setTimeframeFilter: (t) => set({ timeframeFilter: t }),
  setAddModalOpen: (open) =>
    set(open ? { isAddModalOpen: true } : { isAddModalOpen: false, activeAddTab: "ai-research" }),
  setActiveAddTab: (tab) => set({ activeAddTab: tab }),
  setSelectedInsightId: (id) => set({ selectedInsightId: id }),
  resetFilters: () =>
    set({ searchQuery: "", categoryFilter: null, impactFilter: null, timeframeFilter: null }),
}));

// Selectors
export const useSearchQuery = () => useMarketInsightsStore((s) => s.searchQuery);
export const useCategoryFilter = () => useMarketInsightsStore((s) => s.categoryFilter);
export const useImpactFilter = () => useMarketInsightsStore((s) => s.impactFilter);
export const useTimeframeFilter = () => useMarketInsightsStore((s) => s.timeframeFilter);
export const useIsAddModalOpen = () => useMarketInsightsStore((s) => s.isAddModalOpen);
export const useActiveAddTab = () => useMarketInsightsStore((s) => s.activeAddTab);
export const useSelectedInsightId = () => useMarketInsightsStore((s) => s.selectedInsightId);
