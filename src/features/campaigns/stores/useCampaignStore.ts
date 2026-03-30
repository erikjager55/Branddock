// =============================================================
// Campaign Store — Zustand (overview + quick modal + detail)
// =============================================================

import { create } from 'zustand';
import type { ContentCategory } from '@/lib/campaigns/content-types';

interface CampaignStoreState {
  // ─── Overview ──────────────────────────────────────────────
  filterTab: 'all' | 'strategic' | 'quick' | 'completed';
  searchQuery: string;
  viewMode: 'grid' | 'list';
  setFilterTab: (tab: CampaignStoreState['filterTab']) => void;
  setSearchQuery: (q: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;

  // ─── Quick Content Modal ──────────────────────────────────
  isQuickModalOpen: boolean;
  selectedContentCategory: ContentCategory;
  selectedContentType: string | null;
  quickPrompt: string;
  openQuickModal: () => void;
  closeQuickModal: () => void;
  setSelectedContentCategory: (cat: ContentCategory) => void;
  setSelectedContentType: (type: string | null) => void;
  setQuickPrompt: (prompt: string) => void;

  // ─── Campaign Detail ──────────────────────────────────────
  selectedCampaignId: string | null;
  selectedDeliverableId: string | null;
  activeStrategySubTab: 'core-concept' | 'channel-mix' | 'target-audience' | 'deliverables' | 'timeline' | 'strategy' | 'channel-plan';
  timelineViewMode: 'timeline' | 'grid';
  deliverablesViewMode: 'list' | 'board';
  setSelectedCampaignId: (id: string | null) => void;
  setSelectedDeliverableId: (id: string | null) => void;
  setActiveStrategySubTab: (tab: CampaignStoreState['activeStrategySubTab']) => void;
  setTimelineViewMode: (mode: 'timeline' | 'grid') => void;
  setDeliverablesViewMode: (mode: 'list' | 'board') => void;

  // ─── Convert Modal ────────────────────────────────────────
  isConvertModalOpen: boolean;
  convertCampaignName: string;
  openConvertModal: () => void;
  closeConvertModal: () => void;
  setConvertCampaignName: (name: string) => void;

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

  // ─── Quick Content Modal defaults ──────────────────────────
  isQuickModalOpen: false,
  selectedContentCategory: 'written',
  selectedContentType: null,
  quickPrompt: '',
  openQuickModal: () => set({ isQuickModalOpen: true, selectedContentCategory: 'written', selectedContentType: null, quickPrompt: '' }),
  closeQuickModal: () => set({ isQuickModalOpen: false, selectedContentCategory: 'written', selectedContentType: null, quickPrompt: '' }),
  setSelectedContentCategory: (cat) => set({ selectedContentCategory: cat, selectedContentType: null }),
  setSelectedContentType: (type) => set({ selectedContentType: type }),
  setQuickPrompt: (prompt) => set({ quickPrompt: prompt }),

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

  // ─── Convert Modal defaults ────────────────────────────────
  isConvertModalOpen: false,
  convertCampaignName: '',
  openConvertModal: () => set({ isConvertModalOpen: true, convertCampaignName: '' }),
  closeConvertModal: () => set({ isConvertModalOpen: false, convertCampaignName: '' }),
  setConvertCampaignName: (name) => set({ convertCampaignName: name }),

  // ─── Reset ─────────────────────────────────────────────────
  resetOverviewFilters: () => set({ filterTab: 'all', searchQuery: '', viewMode: 'grid' }),
}));
