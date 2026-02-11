"use client";

import { create } from "zustand";

interface QuestionnaireState {
  // Expanded questionnaire in overview
  expandedQuestionnaireId: string | null;
  setExpandedQuestionnaire: (id: string | null) => void;

  // Active wizard step (0-4)
  activeStep: number;
  setActiveStep: (step: number) => void;

  // Add Recipient modal
  isAddRecipientModalOpen: boolean;
  openAddRecipientModal: () => void;
  closeAddRecipientModal: () => void;

  // Validate modal
  isValidateModalOpen: boolean;
  openValidateModal: () => void;
  closeValidateModal: () => void;

  // Analyze tab
  activeAnalyzeTab: string;
  setActiveAnalyzeTab: (tab: string) => void;

  // Unsaved changes
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
}

export const useQuestionnaireStore = create<QuestionnaireState>((set) => ({
  expandedQuestionnaireId: null,
  setExpandedQuestionnaire: (id) =>
    set({ expandedQuestionnaireId: id, activeStep: 0 }),

  activeStep: 0,
  setActiveStep: (step) => set({ activeStep: step }),

  isAddRecipientModalOpen: false,
  openAddRecipientModal: () => set({ isAddRecipientModalOpen: true }),
  closeAddRecipientModal: () => set({ isAddRecipientModalOpen: false }),

  isValidateModalOpen: false,
  openValidateModal: () => set({ isValidateModalOpen: true }),
  closeValidateModal: () => set({ isValidateModalOpen: false }),

  activeAnalyzeTab: "all",
  setActiveAnalyzeTab: (tab) => set({ activeAnalyzeTab: tab }),

  hasUnsavedChanges: false,
  setHasUnsavedChanges: (value) => set({ hasUnsavedChanges: value }),
}));
