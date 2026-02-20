import { create } from "zustand";
import type {
  CampaignGoalType,
  StrategyResultResponse,
} from "../types/campaign-wizard.types";

// ─── Types ────────────────────────────────────────────────

interface CampaignWizardState {
  currentStep: number;
  name: string;
  description: string;
  campaignGoalType: CampaignGoalType | null;
  startDate: string;
  endDate: string;
  selectedKnowledgeIds: string[];
  isGenerating: boolean;
  strategyResult: StrategyResultResponse | null;
  isStrategyEditing: boolean;
  selectedDeliverables: { type: string; quantity: number }[];
  activeDeliverableTab: string;
  saveAsTemplate: boolean;
  templateName: string;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setName: (name: string) => void;
  setDescription: (desc: string) => void;
  setCampaignGoalType: (type: CampaignGoalType) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  toggleKnowledgeId: (id: string) => void;
  selectAllKnowledge: (ids: string[]) => void;
  deselectAllKnowledge: () => void;
  setIsGenerating: (v: boolean) => void;
  setStrategyResult: (result: StrategyResultResponse | null) => void;
  setIsStrategyEditing: (v: boolean) => void;
  toggleDeliverable: (type: string) => void;
  setDeliverableQuantity: (type: string, qty: number) => void;
  setActiveDeliverableTab: (tab: string) => void;
  setSaveAsTemplate: (v: boolean) => void;
  setTemplateName: (name: string) => void;
  canProceed: () => boolean;
  resetWizard: () => void;
}

// ─── Initial state ────────────────────────────────────────

const INITIAL_STATE = {
  currentStep: 1,
  name: "",
  description: "",
  campaignGoalType: null as CampaignGoalType | null,
  startDate: "",
  endDate: "",
  selectedKnowledgeIds: [] as string[],
  isGenerating: false,
  strategyResult: null as StrategyResultResponse | null,
  isStrategyEditing: false,
  selectedDeliverables: [] as { type: string; quantity: number }[],
  activeDeliverableTab: "Written",
  saveAsTemplate: false,
  templateName: "",
};

// ─── Store ────────────────────────────────────────────────

export const useCampaignWizardStore = create<CampaignWizardState>(
  (set, get) => ({
    ...INITIAL_STATE,

    setCurrentStep: (step) => set({ currentStep: step }),
    nextStep: () =>
      set((s) => ({ currentStep: Math.min(5, s.currentStep + 1) })),
    prevStep: () =>
      set((s) => ({ currentStep: Math.max(1, s.currentStep - 1) })),

    setName: (name) => set({ name }),
    setDescription: (description) => set({ description }),
    setCampaignGoalType: (campaignGoalType) => set({ campaignGoalType }),
    setStartDate: (startDate) => set({ startDate }),
    setEndDate: (endDate) => set({ endDate }),

    toggleKnowledgeId: (id) =>
      set((s) => ({
        selectedKnowledgeIds: s.selectedKnowledgeIds.includes(id)
          ? s.selectedKnowledgeIds.filter((x) => x !== id)
          : [...s.selectedKnowledgeIds, id],
      })),
    selectAllKnowledge: (ids) => set({ selectedKnowledgeIds: ids }),
    deselectAllKnowledge: () => set({ selectedKnowledgeIds: [] }),

    setIsGenerating: (isGenerating) => set({ isGenerating }),
    setStrategyResult: (strategyResult) => set({ strategyResult }),
    setIsStrategyEditing: (isStrategyEditing) => set({ isStrategyEditing }),

    toggleDeliverable: (type) =>
      set((s) => {
        const exists = s.selectedDeliverables.find((d) => d.type === type);
        if (exists) {
          return {
            selectedDeliverables: s.selectedDeliverables.filter(
              (d) => d.type !== type,
            ),
          };
        }
        return {
          selectedDeliverables: [
            ...s.selectedDeliverables,
            { type, quantity: 1 },
          ],
        };
      }),

    setDeliverableQuantity: (type, qty) =>
      set((s) => ({
        selectedDeliverables: s.selectedDeliverables.map((d) =>
          d.type === type ? { ...d, quantity: qty } : d,
        ),
      })),

    setActiveDeliverableTab: (activeDeliverableTab) =>
      set({ activeDeliverableTab }),
    setSaveAsTemplate: (saveAsTemplate) => set({ saveAsTemplate }),
    setTemplateName: (templateName) => set({ templateName }),

    canProceed: () => {
      const state = get();
      switch (state.currentStep) {
        case 1:
          return state.name.trim().length > 0 && state.campaignGoalType !== null;
        case 2:
          return state.selectedKnowledgeIds.length > 0;
        case 3:
          return state.strategyResult !== null;
        case 4:
          return state.selectedDeliverables.length > 0;
        case 5:
          return true;
        default:
          return false;
      }
    },

    resetWizard: () => set(INITIAL_STATE),
  }),
);
