import { create } from "zustand";
import type {
  BrandStyleguide,
  AnalysisStatusResponse,
  StyleguideTab,
} from "@/types/brandstyle";

interface BrandstyleStore {
  styleguide: BrandStyleguide | null;
  analysisJobId: string | null;
  analysisStatus: AnalysisStatusResponse | null;
  isAnalyzing: boolean;

  // Styleguide tabs
  activeTab: StyleguideTab;
  selectedColorId: string | null;
  isColorModalOpen: boolean;

  // Actions
  setStyleguide: (sg: BrandStyleguide | null) => void;
  startAnalysis: (jobId: string) => void;
  setAnalysisStatus: (status: AnalysisStatusResponse) => void;
  completeAnalysis: () => void;
  setActiveTab: (tab: StyleguideTab) => void;
  openColorModal: (colorId: string) => void;
  closeColorModal: () => void;
  reset: () => void;
}

const initialState = {
  styleguide: null as BrandStyleguide | null,
  analysisJobId: null as string | null,
  analysisStatus: null as AnalysisStatusResponse | null,
  isAnalyzing: false,
  activeTab: "logo" as StyleguideTab,
  selectedColorId: null as string | null,
  isColorModalOpen: false,
};

export const useBrandstyleStore = create<BrandstyleStore>((set) => ({
  ...initialState,

  setStyleguide: (sg) => set({ styleguide: sg }),
  startAnalysis: (jobId) =>
    set({ analysisJobId: jobId, isAnalyzing: true, analysisStatus: null }),
  setAnalysisStatus: (status) => set({ analysisStatus: status }),
  completeAnalysis: () => set({ isAnalyzing: false, analysisJobId: null }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  openColorModal: (colorId) =>
    set({ selectedColorId: colorId, isColorModalOpen: true }),
  closeColorModal: () =>
    set({ selectedColorId: null, isColorModalOpen: false }),
  reset: () => set(initialState),
}));
