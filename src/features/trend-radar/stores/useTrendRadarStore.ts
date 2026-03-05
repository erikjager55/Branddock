// =============================================================
// Trend Radar Zustand Store
// =============================================================

import { create } from 'zustand';
import type {
  InsightCategory,
  ImpactLevel,
  TrendDetectionSource,
} from '../types/trend-radar.types';

type ActiveTab = 'sources' | 'feed' | 'alerts' | 'activate';

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
  selectedSourceId: string | null;
  setSelectedTrendId: (id: string | null) => void;
  setSelectedSourceId: (id: string | null) => void;

  // Modals
  isAddSourceModalOpen: boolean;
  isEditSourceModalOpen: boolean;
  isAddManualTrendModalOpen: boolean;
  isScanProgressModalOpen: boolean;
  openAddSourceModal: () => void;
  closeAddSourceModal: () => void;
  openEditSourceModal: (sourceId: string) => void;
  closeEditSourceModal: () => void;
  openAddManualTrendModal: () => void;
  closeAddManualTrendModal: () => void;
  openScanProgressModal: () => void;
  closeScanProgressModal: () => void;

  // Scan state
  scanJobId: string | null;
  setScanJobId: (id: string | null) => void;
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
  selectedSourceId: null,
  setSelectedTrendId: (id) => set({ selectedTrendId: id }),
  setSelectedSourceId: (id) => set({ selectedSourceId: id }),

  // Modals
  isAddSourceModalOpen: false,
  isEditSourceModalOpen: false,
  isAddManualTrendModalOpen: false,
  isScanProgressModalOpen: false,
  openAddSourceModal: () => set({ isAddSourceModalOpen: true }),
  closeAddSourceModal: () => set({ isAddSourceModalOpen: false }),
  openEditSourceModal: (sourceId) =>
    set({ isEditSourceModalOpen: true, selectedSourceId: sourceId }),
  closeEditSourceModal: () =>
    set({ isEditSourceModalOpen: false, selectedSourceId: null }),
  openAddManualTrendModal: () => set({ isAddManualTrendModalOpen: true }),
  closeAddManualTrendModal: () => set({ isAddManualTrendModalOpen: false }),
  openScanProgressModal: () => set({ isScanProgressModalOpen: true }),
  closeScanProgressModal: () =>
    set({ isScanProgressModalOpen: false, scanJobId: null }),

  // Scan state
  scanJobId: null,
  setScanJobId: (id) => set({ scanJobId: id }),
}));
