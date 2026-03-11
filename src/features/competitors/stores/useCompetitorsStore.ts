// =============================================================
// Competitors Zustand Store
// =============================================================

import { create } from "zustand";

interface CompetitorsState {
  // Selected competitor for detail view
  selectedCompetitorId: string | null;
  setSelectedCompetitorId: (id: string | null) => void;

  // Processing modal (analyzer flow)
  isProcessingModalOpen: boolean;
  openProcessingModal: () => void;
  closeProcessingModal: () => void;

  // Analysis result data (temporary, before creating competitor)
  analyzeResultData: unknown | null;
  setAnalyzeResultData: (data: unknown | null) => void;
}

export const useCompetitorsStore = create<CompetitorsState>((set) => ({
  selectedCompetitorId: null,
  setSelectedCompetitorId: (id) => set({ selectedCompetitorId: id }),

  isProcessingModalOpen: false,
  openProcessingModal: () => set({ isProcessingModalOpen: true }),
  closeProcessingModal: () => set({ isProcessingModalOpen: false }),

  analyzeResultData: null,
  setAnalyzeResultData: (data) => set({ analyzeResultData: data }),
}));
