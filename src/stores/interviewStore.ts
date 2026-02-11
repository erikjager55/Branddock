import { create } from "zustand";

interface InterviewState {
  // Expanded interview in overview (inline wizard)
  expandedInterviewId: string | null;
  setExpandedInterview: (id: string | null) => void;

  // Active wizard step (0-4 → Contact, Schedule, Questions, Conduct, Review)
  activeStep: number;
  setActiveStep: (step: number) => void;

  // Add Question modal
  isAddQuestionModalOpen: boolean;
  defaultAssetForQuestion: string | null;
  openAddQuestionModal: (defaultAssetId?: string) => void;
  closeAddQuestionModal: () => void;

  // Question Templates slide-out panel
  isTemplatesPanelOpen: boolean;
  templateFilterAsset: string | null;
  openTemplatesPanel: (filterAssetType?: string) => void;
  closeTemplatesPanel: () => void;

  // Conduct step - current question index
  currentQuestionIndex: number;
  setCurrentQuestionIndex: (index: number) => void;

  // Unsaved changes tracking
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;

  // Reset all state
  reset: () => void;
}

export const useInterviewStore = create<InterviewState>((set) => ({
  expandedInterviewId: null,
  setExpandedInterview: (id) =>
    set({ expandedInterviewId: id, activeStep: 0, currentQuestionIndex: 0 }),

  activeStep: 0,
  setActiveStep: (step) => set({ activeStep: step }),

  isAddQuestionModalOpen: false,
  defaultAssetForQuestion: null,
  openAddQuestionModal: (defaultAssetId) =>
    set({
      isAddQuestionModalOpen: true,
      defaultAssetForQuestion: defaultAssetId ?? null,
    }),
  closeAddQuestionModal: () =>
    set({ isAddQuestionModalOpen: false, defaultAssetForQuestion: null }),

  isTemplatesPanelOpen: false,
  templateFilterAsset: null,
  openTemplatesPanel: (filterAssetType) =>
    set({
      isTemplatesPanelOpen: true,
      templateFilterAsset: filterAssetType ?? null,
    }),
  closeTemplatesPanel: () =>
    set({ isTemplatesPanelOpen: false, templateFilterAsset: null }),

  currentQuestionIndex: 0,
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),

  hasUnsavedChanges: false,
  setHasUnsavedChanges: (value) => set({ hasUnsavedChanges: value }),

  reset: () =>
    set({
      expandedInterviewId: null,
      activeStep: 0,
      isAddQuestionModalOpen: false,
      defaultAssetForQuestion: null,
      isTemplatesPanelOpen: false,
      templateFilterAsset: null,
      currentQuestionIndex: 0,
      hasUnsavedChanges: false,
    }),
}));
