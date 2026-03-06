// =============================================================
// Trend Radar Zustand Store
// =============================================================

import { create } from 'zustand';
import type {
  InsightCategory,
  ImpactLevel,
  TrendDetectionSource,
} from '../types/trend-radar.types';

type ActiveTab = 'feed' | 'alerts' | 'activate';

interface TrendRadarState {
  // Tab
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Filters (feed)
  searchQuery: string;
  categoryFilter: InsightCategory | undefined;
  impactFilter: ImpactLevel | undefined;
  detectionSourceFilter: TrendDetectionSource | undefined;
  showDismissed: boolean;
  setSearchQuery: (q: string) => void;
  setCategoryFilter: (c: InsightCategory | undefined) => void;
  setImpactFilter: (i: ImpactLevel | undefined) => void;
  setDetectionSourceFilter: (d: TrendDetectionSource | undefined) => void;
  setShowDismissed: (v: boolean) => void;
  resetFilters: () => void;

  // Selected items
  selectedTrendId: string | null;
  setSelectedTrendId: (id: string | null) => void;

  // Modals
  isAddManualTrendModalOpen: boolean;
  isResearchModalOpen: boolean;
  isResearchProgressModalOpen: boolean;
  openAddManualTrendModal: () => void;
  closeAddManualTrendModal: () => void;
  openResearchModal: () => void;
  closeResearchModal: () => void;
  openResearchProgressModal: () => void;
  closeResearchProgressModal: () => void;

  // Research state
  researchJobId: string | null;
  setResearchJobId: (id: string | null) => void;
}

export const useTrendRadarStore = create<TrendRadarState>((set) => ({
  // Tab
  activeTab: 'feed',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Filters
  searchQuery: '',
  categoryFilter: undefined,
  impactFilter: undefined,
  detectionSourceFilter: undefined,
  showDismissed: false,
  setSearchQuery: (q) => set({ searchQuery: q }),
  setCategoryFilter: (c) => set({ categoryFilter: c }),
  setImpactFilter: (i) => set({ impactFilter: i }),
  setDetectionSourceFilter: (d) => set({ detectionSourceFilter: d }),
  setShowDismissed: (v) => set({ showDismissed: v }),
  resetFilters: () =>
    set({
      searchQuery: '',
      categoryFilter: undefined,
      impactFilter: undefined,
      detectionSourceFilter: undefined,
      showDismissed: false,
    }),

  // Selected items
  selectedTrendId: null,
  setSelectedTrendId: (id) => set({ selectedTrendId: id }),

  // Modals
  isAddManualTrendModalOpen: false,
  isResearchModalOpen: false,
  isResearchProgressModalOpen: false,
  openAddManualTrendModal: () => set({ isAddManualTrendModalOpen: true }),
  closeAddManualTrendModal: () => set({ isAddManualTrendModalOpen: false }),
  openResearchModal: () => set({ isResearchModalOpen: true }),
  closeResearchModal: () => set({ isResearchModalOpen: false }),
  openResearchProgressModal: () => set({ isResearchProgressModalOpen: true }),
  closeResearchProgressModal: () =>
    set({ isResearchProgressModalOpen: false, researchJobId: null }),

  // Research state
  researchJobId: null,
  setResearchJobId: (id) => set({ researchJobId: id }),
}));
