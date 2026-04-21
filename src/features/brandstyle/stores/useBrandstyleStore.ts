import { create } from "zustand";
import type { StyleguideTab, ComponentTypeKey } from "../types/brandstyle.types";

interface BrandstyleState {
  // Analysis
  analysisJobId: string | null;
  analysisStatus: string | null;
  isAnalyzing: boolean;

  // Styleguide tabs
  activeTab: StyleguideTab;
  /** Active Components sub-tab. Lifted out of ComponentsSection local
   *  state so the "Continue review" button can auto-select the correct
   *  sub-tab for the next pending review panel (otherwise the scroll
   *  target doesn't exist in the DOM). */
  activeComponentType: ComponentTypeKey;

  // Edit mode (global, matches Brand Asset Detail pattern)
  isEditing: boolean;

  // Color modal
  selectedColorId: string | null;
  isColorModalOpen: boolean;

  // Brand Assets modals (Fase 1)
  isFontUploadOpen: boolean;
  isLogoUploadOpen: boolean;

  // Actions
  setActiveTab: (tab: StyleguideTab) => void;
  setActiveComponentType: (type: ComponentTypeKey) => void;
  setIsEditing: (editing: boolean) => void;
  openColorModal: (colorId: string) => void;
  closeColorModal: () => void;
  openFontUpload: () => void;
  closeFontUpload: () => void;
  openLogoUpload: () => void;
  closeLogoUpload: () => void;
  startAnalysis: (jobId: string) => void;
  stopAnalysis: () => void;
  setAnalysisStatus: (status: string) => void;
  reset: () => void;
}

export const useBrandstyleStore = create<BrandstyleState>((set) => ({
  analysisJobId: null,
  analysisStatus: null,
  isAnalyzing: false,

  activeTab: "brand_assets",
  activeComponentType: "BUTTON",

  isEditing: false,

  selectedColorId: null,
  isColorModalOpen: false,

  isFontUploadOpen: false,
  isLogoUploadOpen: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveComponentType: (type) => set({ activeComponentType: type }),

  setIsEditing: (editing) => set({ isEditing: editing }),

  openColorModal: (colorId) =>
    set({ selectedColorId: colorId, isColorModalOpen: true }),

  closeColorModal: () =>
    set({ selectedColorId: null, isColorModalOpen: false }),

  openFontUpload: () => set({ isFontUploadOpen: true }),
  closeFontUpload: () => set({ isFontUploadOpen: false }),
  openLogoUpload: () => set({ isLogoUploadOpen: true }),
  closeLogoUpload: () => set({ isLogoUploadOpen: false }),

  startAnalysis: (jobId) =>
    set({ analysisJobId: jobId, isAnalyzing: true, analysisStatus: "SCANNING_STRUCTURE" }),

  stopAnalysis: () =>
    set({ analysisJobId: null, isAnalyzing: false, analysisStatus: null }),

  setAnalysisStatus: (status) =>
    set({ analysisStatus: status, isAnalyzing: status !== "COMPLETE" && status !== "ERROR" }),

  reset: () =>
    set({
      analysisJobId: null,
      analysisStatus: null,
      isAnalyzing: false,
      activeTab: "brand_assets",
      activeComponentType: "BUTTON",
      isEditing: false,
      selectedColorId: null,
      isColorModalOpen: false,
      isFontUploadOpen: false,
      isLogoUploadOpen: false,
    }),
}));
