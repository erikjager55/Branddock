import { create } from "zustand";
import type { StyleguideTab } from "../types/brandstyle.types";

interface BrandstyleState {
  // Analysis
  analysisJobId: string | null;
  analysisStatus: string | null;
  isAnalyzing: boolean;

  // Styleguide tabs
  activeTab: StyleguideTab;

  // Color modal
  selectedColorId: string | null;
  isColorModalOpen: boolean;

  // Actions
  setActiveTab: (tab: StyleguideTab) => void;
  openColorModal: (colorId: string) => void;
  closeColorModal: () => void;
  startAnalysis: (jobId: string) => void;
  setAnalysisStatus: (status: string) => void;
  reset: () => void;
}

export const useBrandstyleStore = create<BrandstyleState>((set) => ({
  analysisJobId: null,
  analysisStatus: null,
  isAnalyzing: false,

  activeTab: "logo",

  selectedColorId: null,
  isColorModalOpen: false,

  setActiveTab: (tab) => set({ activeTab: tab }),

  openColorModal: (colorId) =>
    set({ selectedColorId: colorId, isColorModalOpen: true }),

  closeColorModal: () =>
    set({ selectedColorId: null, isColorModalOpen: false }),

  startAnalysis: (jobId) =>
    set({ analysisJobId: jobId, isAnalyzing: true, analysisStatus: "SCANNING_STRUCTURE" }),

  setAnalysisStatus: (status) =>
    set({ analysisStatus: status, isAnalyzing: status !== "COMPLETE" && status !== "ERROR" }),

  reset: () =>
    set({
      analysisJobId: null,
      analysisStatus: null,
      isAnalyzing: false,
      activeTab: "logo",
      selectedColorId: null,
      isColorModalOpen: false,
    }),
}));
