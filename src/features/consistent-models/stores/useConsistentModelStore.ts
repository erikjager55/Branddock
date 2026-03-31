// =============================================================
// Consistent Model Store (UI State)
// =============================================================

import { create } from "zustand";
import type { ConsistentModelType } from "../types/consistent-model.types";

interface UploadProgress {
  fileId: string;
  progress: number;
}

interface ConsistentModelStore {
  // Selection
  selectedModelId: string | null;
  selectedModelType: ConsistentModelType | null;

  // Modals
  isCreateModalOpen: boolean;
  isTrainingModalOpen: boolean;
  isGenerateModalOpen: boolean;

  // Upload progress
  uploadProgress: Map<string, number>;

  // Generation queue
  generationQueue: string[];

  // Wizard step
  wizardStep: number;

  // Actions — Selection
  setSelectedModel: (id: string | null) => void;
  setSelectedModelType: (type: ConsistentModelType | null) => void;

  // Actions — Modals
  openCreateModal: (type?: ConsistentModelType) => void;
  closeCreateModal: () => void;
  openTrainingModal: () => void;
  closeTrainingModal: () => void;
  openGenerateModal: () => void;
  closeGenerateModal: () => void;

  // Actions — Upload
  setUploadProgress: (fileId: string, progress: number) => void;
  clearUploadProgress: () => void;

  // Actions — Generation queue
  addToGenerationQueue: (id: string) => void;
  removeFromGenerationQueue: (id: string) => void;
  clearGenerationQueue: () => void;

  // Actions — Wizard
  setWizardStep: (step: number) => void;
  nextWizardStep: () => void;
  prevWizardStep: () => void;
  resetWizardStep: () => void;
}

export const useConsistentModelStore = create<ConsistentModelStore>((set) => ({
  // State
  selectedModelId: null,
  selectedModelType: null,
  isCreateModalOpen: false,
  isTrainingModalOpen: false,
  isGenerateModalOpen: false,
  uploadProgress: new Map(),
  generationQueue: [],
  wizardStep: 1,

  // Selection
  setSelectedModel: (id) => set({ selectedModelId: id }),
  setSelectedModelType: (type) => set({ selectedModelType: type }),

  // Modals
  openCreateModal: (type) =>
    set({
      isCreateModalOpen: true,
      selectedModelType: type ?? null,
    }),
  closeCreateModal: () =>
    set({
      isCreateModalOpen: false,
      selectedModelType: null,
    }),
  openTrainingModal: () => set({ isTrainingModalOpen: true }),
  closeTrainingModal: () => set({ isTrainingModalOpen: false }),
  openGenerateModal: () => set({ isGenerateModalOpen: true }),
  closeGenerateModal: () => set({ isGenerateModalOpen: false }),

  // Upload progress (new Map on mutation for reactivity)
  setUploadProgress: (fileId, progress) =>
    set((state) => {
      const next = new Map(state.uploadProgress);
      next.set(fileId, progress);
      return { uploadProgress: next };
    }),
  clearUploadProgress: () => set({ uploadProgress: new Map() }),

  // Generation queue
  addToGenerationQueue: (id) =>
    set((state) => ({
      generationQueue: [...state.generationQueue, id],
    })),
  removeFromGenerationQueue: (id) =>
    set((state) => ({
      generationQueue: state.generationQueue.filter((qId) => qId !== id),
    })),
  clearGenerationQueue: () => set({ generationQueue: [] }),

  // Wizard
  setWizardStep: (step) => set({ wizardStep: step }),
  nextWizardStep: () =>
    set((s) => ({ wizardStep: Math.min(3, s.wizardStep + 1) })),
  prevWizardStep: () =>
    set((s) => ({ wizardStep: Math.max(1, s.wizardStep - 1) })),
  resetWizardStep: () => set({ wizardStep: 1 }),
}));
