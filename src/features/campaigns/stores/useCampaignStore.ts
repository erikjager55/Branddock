// =============================================================
// Campaign Store — Zustand (overview + detail)
// =============================================================

import { create } from 'zustand';

interface CampaignStoreState {
  // ─── Overview ──────────────────────────────────────────────
  filterTab: 'all' | 'strategic' | 'quick' | 'completed';
  searchQuery: string;
  viewMode: 'grid' | 'list' | 'calendar';
  setFilterTab: (tab: CampaignStoreState['filterTab']) => void;
  setSearchQuery: (q: string) => void;
  setViewMode: (mode: 'grid' | 'list' | 'calendar') => void;

  // ─── Campaign Detail ──────────────────────────────────────
  selectedCampaignId: string | null;
  selectedDeliverableId: string | null;
  activeStrategySubTab: 'core-concept' | 'channel-mix' | 'target-audience' | 'deliverables' | 'timeline' | 'strategy' | 'channel-plan';
  timelineViewMode: 'timeline' | 'grid' | 'calendar';
  deliverablesViewMode: 'list' | 'board';
  setSelectedCampaignId: (id: string | null) => void;
  setSelectedDeliverableId: (id: string | null) => void;
  setActiveStrategySubTab: (tab: CampaignStoreState['activeStrategySubTab']) => void;
  setTimelineViewMode: (mode: 'timeline' | 'grid' | 'calendar') => void;
  setDeliverablesViewMode: (mode: 'list' | 'board') => void;

  // ─── Reset ────────────────────────────────────────────────
  resetOverviewFilters: () => void;
}

export const useCampaignStore = create<CampaignStoreState>((set) => ({
  // ─── Overview defaults ─────────────────────────────────────
  filterTab: 'all',
  searchQuery: '',
  viewMode: 'grid',
  setFilterTab: (tab) => set({ filterTab: tab }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setViewMode: (mode) => set({ viewMode: mode }),

  // ─── Campaign Detail defaults ──────────────────────────────
  selectedCampaignId: null,
  selectedDeliverableId: null,
  activeStrategySubTab: 'timeline',
  timelineViewMode: 'timeline',
  deliverablesViewMode: 'list',
  setSelectedCampaignId: (id) => set({ selectedCampaignId: id }),
  setSelectedDeliverableId: (id) => set({ selectedDeliverableId: id }),
  setActiveStrategySubTab: (tab) => set({ activeStrategySubTab: tab }),
  setTimelineViewMode: (mode) => set({ timelineViewMode: mode }),
  setDeliverablesViewMode: (mode) => set({ deliverablesViewMode: mode }),

  // ─── Reset ─────────────────────────────────────────────────
  resetOverviewFilters: () => set({ filterTab: 'all', searchQuery: '', viewMode: 'grid' }),
}));
