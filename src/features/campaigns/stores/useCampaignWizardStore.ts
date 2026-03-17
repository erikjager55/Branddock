import { create } from "zustand";
import { getTimeBinding } from "../lib/goal-types";
import type {
  CampaignGoalType,
  StrategyResultResponse,
  CampaignBlueprint,
  PipelineStep,
  StrategicIntent,
  CampaignBriefing,
  StrategyPhase,
  StrategyLayer,
  ArchitectureLayer,
  PersonaValidationResult,
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

  // ─── Campaign Briefing ──────────────────────────────────
  briefingOccasion: string;
  briefingAudienceObjective: string;
  briefingCoreMessage: string;
  briefingTonePreference: string;
  briefingConstraints: string;

  // ─── Blueprint Pipeline ──────────────────────────────────
  strategicIntent: StrategicIntent;
  blueprintResult: CampaignBlueprint | null;
  pipelineSteps: PipelineStep[];
  currentPipelineStep: number;
  pipelineError: string | null;

  // ─── Interactive Strategy Phases ──────────────────────────
  strategyPhase: StrategyPhase;
  variantA: ArchitectureLayer | null;
  variantB: ArchitectureLayer | null;
  personaValidation: PersonaValidationResult[] | null;
  variantAScore: number;
  variantBScore: number;
  strategyLayerA: StrategyLayer | null;
  strategyLayerB: StrategyLayer | null;
  variantFeedback: string;
  synthesisFeedback: string;
  synthesizedStrategy: StrategyLayer | null;
  synthesizedArchitecture: ArchitectureLayer | null;

  // ─── Interactive Feedback (Variant Review) ─────────────────
  endorsedPersonaIds: string[];
  strategyRatings: Record<string, 'up' | 'down'>;

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

  // ─── Campaign Briefing Actions ──────────────────────────
  setBriefingOccasion: (v: string) => void;
  setBriefingAudienceObjective: (v: string) => void;
  setBriefingCoreMessage: (v: string) => void;
  setBriefingTonePreference: (v: string) => void;
  setBriefingConstraints: (v: string) => void;

  // ─── Blueprint Pipeline Actions ──────────────────────────
  setStrategicIntent: (intent: StrategicIntent) => void;
  setBlueprintResult: (result: CampaignBlueprint | null) => void;
  updateStepStatus: (step: PipelineStep) => void;
  setPipelineError: (error: string | null) => void;
  resetPipeline: () => void;

  // ─── Interactive Strategy Phase Actions ─────────────────
  setStrategyPhase: (phase: StrategyPhase) => void;
  setVariantResults: (data: {
    strategyLayerA: StrategyLayer;
    strategyLayerB: StrategyLayer;
    variantA: ArchitectureLayer;
    variantB: ArchitectureLayer;
    personaValidation: PersonaValidationResult[];
    variantAScore: number;
    variantBScore: number;
  }) => void;
  setVariantFeedback: (feedback: string) => void;
  setSynthesisResult: (data: { strategy: StrategyLayer; architecture: ArchitectureLayer }) => void;
  setSynthesisFeedback: (feedback: string) => void;
  clearPhaseData: () => void;

  // ─── Interactive Feedback Actions ─────────────────────────
  togglePersonaEndorsement: (personaId: string) => void;
  setStrategyRating: (key: string, rating: 'up' | 'down' | null) => void;
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
  activeDeliverableTab: "Long-Form Content",
  saveAsTemplate: false,
  templateName: "",

  // ─── Campaign Briefing ──────────────────────────────────
  briefingOccasion: "",
  briefingAudienceObjective: "",
  briefingCoreMessage: "",
  briefingTonePreference: "",
  briefingConstraints: "",

  // ─── Blueprint Pipeline ──────────────────────────────────
  strategicIntent: "hybrid" as StrategicIntent,
  blueprintResult: null as CampaignBlueprint | null,
  pipelineSteps: [] as PipelineStep[],
  currentPipelineStep: 0,
  pipelineError: null as string | null,

  // ─── Interactive Strategy Phases ──────────────────────────
  strategyPhase: "idle" as StrategyPhase,
  variantA: null as ArchitectureLayer | null,
  variantB: null as ArchitectureLayer | null,
  personaValidation: null as PersonaValidationResult[] | null,
  variantAScore: 0,
  variantBScore: 0,
  strategyLayerA: null as StrategyLayer | null,
  strategyLayerB: null as StrategyLayer | null,
  variantFeedback: "",
  synthesisFeedback: "",
  synthesizedStrategy: null as StrategyLayer | null,
  synthesizedArchitecture: null as ArchitectureLayer | null,

  // ─── Interactive Feedback ──────────────────────────────────
  endorsedPersonaIds: [] as string[],
  strategyRatings: {} as Record<string, 'up' | 'down'>,
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
    setCampaignGoalType: (campaignGoalType) => {
      const updates: Partial<CampaignWizardState> = { campaignGoalType };
      // Clear dates when switching to an always-on goal (dates are hidden)
      if (getTimeBinding(campaignGoalType) === 'always-on') {
        updates.startDate = '';
        updates.endDate = '';
      }
      set(updates);
    },
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
        case 1: {
          const hasName = state.name.trim().length > 0;
          const hasGoal = state.campaignGoalType !== null;
          if (!hasName || !hasGoal) return false;
          // Time-bound goals require both dates, and end must be >= start
          if (state.campaignGoalType && getTimeBinding(state.campaignGoalType) === 'time-bound') {
            return state.startDate.length > 0 && state.endDate.length > 0 && state.endDate >= state.startDate;
          }
          return true;
        }
        case 2:
          return state.selectedKnowledgeIds.length > 0;
        case 3:
          return state.strategyPhase === 'complete' && state.blueprintResult !== null;
        case 4:
          return state.selectedDeliverables.length > 0;
        case 5:
          return true;
        default:
          return false;
      }
    },

    resetWizard: () => set(INITIAL_STATE),

    // ─── Campaign Briefing Actions ──────────────────────────
    setBriefingOccasion: (briefingOccasion) => set({ briefingOccasion }),
    setBriefingAudienceObjective: (briefingAudienceObjective) =>
      set({ briefingAudienceObjective }),
    setBriefingCoreMessage: (briefingCoreMessage) =>
      set({ briefingCoreMessage }),
    setBriefingTonePreference: (briefingTonePreference) =>
      set({ briefingTonePreference }),
    setBriefingConstraints: (briefingConstraints) =>
      set({ briefingConstraints }),

    // ─── Blueprint Pipeline Actions ──────────────────────────
    setStrategicIntent: (strategicIntent) => set({ strategicIntent }),
    setBlueprintResult: (blueprintResult) => set({ blueprintResult }),
    updateStepStatus: (step) =>
      set((s) => {
        const steps = [...s.pipelineSteps];
        const idx = steps.findIndex((st) => st.step === step.step);
        if (idx >= 0) {
          steps[idx] = step;
        } else {
          steps.push(step);
        }
        return {
          pipelineSteps: steps,
          currentPipelineStep: step.step,
        };
      }),
    setPipelineError: (pipelineError) => set({ pipelineError }),
    resetPipeline: () =>
      set({
        blueprintResult: null,
        pipelineSteps: [],
        currentPipelineStep: 0,
        pipelineError: null,
      }),

    // ─── Interactive Strategy Phase Actions ─────────────────
    setStrategyPhase: (strategyPhase) => set({ strategyPhase }),
    setVariantResults: (data) =>
      set({
        strategyLayerA: data.strategyLayerA,
        strategyLayerB: data.strategyLayerB,
        variantA: data.variantA,
        variantB: data.variantB,
        personaValidation: data.personaValidation,
        variantAScore: data.variantAScore,
        variantBScore: data.variantBScore,
      }),
    setVariantFeedback: (variantFeedback) => set({ variantFeedback }),
    setSynthesisResult: (data) =>
      set({
        synthesizedStrategy: data.strategy,
        synthesizedArchitecture: data.architecture,
      }),
    setSynthesisFeedback: (synthesisFeedback) => set({ synthesisFeedback }),
    clearPhaseData: () =>
      set({
        strategyLayerA: null,
        strategyLayerB: null,
        variantA: null,
        variantB: null,
        personaValidation: null,
        variantAScore: 0,
        variantBScore: 0,
        synthesizedStrategy: null,
        synthesizedArchitecture: null,
        variantFeedback: "",
        synthesisFeedback: "",
        endorsedPersonaIds: [],
        strategyRatings: {},
      }),

    // ─── Interactive Feedback Actions ─────────────────────────
    togglePersonaEndorsement: (personaId) =>
      set((s) => ({
        endorsedPersonaIds: s.endorsedPersonaIds.includes(personaId)
          ? s.endorsedPersonaIds.filter((id) => id !== personaId)
          : [...s.endorsedPersonaIds, personaId],
      })),
    setStrategyRating: (key, rating) =>
      set((s) => {
        const next = { ...s.strategyRatings };
        if (rating === null) {
          delete next[key];
        } else {
          next[key] = rating;
        }
        return { strategyRatings: next };
      }),
  }),
);
