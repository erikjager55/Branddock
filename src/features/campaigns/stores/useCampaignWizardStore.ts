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
  ArenaEnrichmentTracking,
  EnrichmentSources,
  // ─── 9-Phase Architecture Types ──────────────────────────
  CreativeHook,
  BriefingValidation,
  StrategyFoundation,
  EnrichmentContext,
  CuratorSelection,
  HookConcept,
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
  personaValidation: PersonaValidationResult[] | null;
  synthesizedStrategy: StrategyLayer | null;
  synthesizedArchitecture: ArchitectureLayer | null;
  arenaEnrichment: ArenaEnrichmentTracking | null;

  // ─── 9-Phase Architecture ──────────────────────────────────
  briefingValidation: BriefingValidation | null;
  strategyFoundation: StrategyFoundation | null;
  strategyFeedback: string;
  enrichmentContext: EnrichmentContext | null;
  curatorSelection: CuratorSelection | null;
  hooks: CreativeHook[];
  hookScores: number[];
  hookFeedback: Record<number, string>;
  selectedHookIndex: number | null;
  refinedHookConcept: HookConcept | null;

  // @deprecated — legacy variant fields, removed in Session 4 UI rewrite
  variantA: ArchitectureLayer | null;
  variantB: ArchitectureLayer | null;
  variantC: ArchitectureLayer | null;
  variantAScore: number;
  variantBScore: number;
  variantCScore: number;
  strategyLayerA: StrategyLayer | null;
  strategyLayerB: StrategyLayer | null;
  strategyLayerC: StrategyLayer | null;
  variantFeedback: string;
  synthesisFeedback: string;

  // ─── Enrichment Status (real-time feedback for all sources) ─────────
  enrichmentStatus: 'idle' | 'running' | 'complete' | 'skipped';
  enrichmentBlockCount: number;
  enrichmentQueries: string[];
  enrichmentSources: EnrichmentSources;

  // ─── Interactive Feedback (Hook Review) ──────────────────────
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
  setSynthesisResult: (data: { strategy: StrategyLayer; architecture: ArchitectureLayer }) => void;
  clearPhaseData: () => void;

  // ─── 9-Phase Architecture Actions ─────────────────────────
  setBriefingValidation: (validation: BriefingValidation | null) => void;
  setStrategyFoundation: (foundation: StrategyFoundation | null) => void;
  setStrategyFeedback: (feedback: string) => void;
  setEnrichmentContext: (context: EnrichmentContext | null) => void;
  setCuratorSelection: (selection: CuratorSelection | null) => void;
  setHookResults: (data: {
    hooks: CreativeHook[];
    personaValidation: PersonaValidationResult[];
    hookScores: number[];
    curatorSelection: CuratorSelection;
    arenaEnrichment?: ArenaEnrichmentTracking | null;
  }) => void;
  setHookFeedback: (hookIndex: number, feedback: string) => void;
  setSelectedHook: (index: number | null) => void;
  setRefinedHookConcept: (concept: HookConcept | null) => void;

  // ─── Enrichment Status Actions ──────────────────────────────
  setEnrichmentStatus: (status: 'idle' | 'running' | 'complete' | 'skipped', meta?: { totalBlocks?: number; queries?: string[]; sources?: EnrichmentSources }) => void;

  // @deprecated — legacy variant actions, removed in Session 4 UI rewrite
  setVariantResults: (data: {
    strategyLayerA: StrategyLayer;
    strategyLayerB: StrategyLayer;
    strategyLayerC: StrategyLayer;
    variantA: ArchitectureLayer;
    variantB: ArchitectureLayer;
    variantC: ArchitectureLayer;
    personaValidation: PersonaValidationResult[];
    variantAScore: number;
    variantBScore: number;
    variantCScore: number;
    arenaEnrichment?: ArenaEnrichmentTracking | null;
  }) => void;
  setVariantFeedback: (feedback: string) => void;
  setSynthesisFeedback: (feedback: string) => void;

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
  personaValidation: null as PersonaValidationResult[] | null,
  synthesizedStrategy: null as StrategyLayer | null,
  synthesizedArchitecture: null as ArchitectureLayer | null,
  arenaEnrichment: null as ArenaEnrichmentTracking | null,

  // ─── 9-Phase Architecture ──────────────────────────────────
  briefingValidation: null as BriefingValidation | null,
  strategyFoundation: null as StrategyFoundation | null,
  strategyFeedback: "",
  enrichmentContext: null as EnrichmentContext | null,
  curatorSelection: null as CuratorSelection | null,
  hooks: [] as CreativeHook[],
  hookScores: [] as number[],
  hookFeedback: {} as Record<number, string>,
  selectedHookIndex: null as number | null,
  refinedHookConcept: null as HookConcept | null,

  // @deprecated — legacy variant fields
  variantA: null as ArchitectureLayer | null,
  variantB: null as ArchitectureLayer | null,
  variantC: null as ArchitectureLayer | null,
  variantAScore: 0,
  variantBScore: 0,
  variantCScore: 0,
  strategyLayerA: null as StrategyLayer | null,
  strategyLayerB: null as StrategyLayer | null,
  strategyLayerC: null as StrategyLayer | null,
  variantFeedback: "",
  synthesisFeedback: "",

  // ─── Enrichment Status ──────────────────────────────────────
  enrichmentStatus: 'idle' as 'idle' | 'running' | 'complete' | 'skipped',
  enrichmentBlockCount: 0,
  enrichmentQueries: [] as string[],
  enrichmentSources: {} as { arena?: number; exa?: number; scholar?: number; bct?: boolean },

  // ─── Interactive Feedback (Hook Review) ──────────────────────
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
        enrichmentStatus: 'idle',
        enrichmentBlockCount: 0,
        enrichmentQueries: [],
        enrichmentSources: {},
      }),

    // ─── Interactive Strategy Phase Actions ─────────────────
    setStrategyPhase: (strategyPhase) => set({ strategyPhase }),
    setSynthesisResult: (data) =>
      set({
        synthesizedStrategy: data.strategy,
        synthesizedArchitecture: data.architecture,
      }),
    clearPhaseData: () =>
      set({
        personaValidation: null,
        synthesizedStrategy: null,
        synthesizedArchitecture: null,
        arenaEnrichment: null,
        endorsedPersonaIds: [],
        strategyRatings: {},
        enrichmentStatus: 'idle',
        enrichmentBlockCount: 0,
        enrichmentQueries: [],
        enrichmentSources: {},
        // 9-Phase fields
        briefingValidation: null,
        strategyFoundation: null,
        strategyFeedback: "",
        enrichmentContext: null,
        curatorSelection: null,
        hooks: [],
        hookScores: [],
        hookFeedback: {},
        selectedHookIndex: null,
        refinedHookConcept: null,
        // Legacy variant fields
        variantA: null,
        variantB: null,
        variantC: null,
        variantAScore: 0,
        variantBScore: 0,
        variantCScore: 0,
        strategyLayerA: null,
        strategyLayerB: null,
        strategyLayerC: null,
        variantFeedback: "",
        synthesisFeedback: "",
      }),

    // ─── 9-Phase Architecture Actions ─────────────────────────
    setBriefingValidation: (briefingValidation) => set({ briefingValidation }),
    setStrategyFoundation: (strategyFoundation) => set({ strategyFoundation }),
    setStrategyFeedback: (strategyFeedback) => set({ strategyFeedback }),
    setEnrichmentContext: (enrichmentContext) => set({ enrichmentContext }),
    setCuratorSelection: (curatorSelection) => set({ curatorSelection }),
    setHookResults: (data) =>
      set({
        hooks: data.hooks,
        personaValidation: data.personaValidation,
        hookScores: data.hookScores,
        curatorSelection: data.curatorSelection,
        arenaEnrichment: data.arenaEnrichment ?? null,
      }),
    setHookFeedback: (hookIndex, feedback) =>
      set((s) => ({
        hookFeedback: { ...s.hookFeedback, [hookIndex]: feedback },
      })),
    setSelectedHook: (selectedHookIndex) => set({ selectedHookIndex }),
    setRefinedHookConcept: (refinedHookConcept) => set({ refinedHookConcept }),

    // ─── Enrichment Status Actions ──────────────────────────────
    setEnrichmentStatus: (status, meta) =>
      set({
        enrichmentStatus: status,
        enrichmentBlockCount: meta?.totalBlocks ?? 0,
        enrichmentQueries: meta?.queries ?? [],
        enrichmentSources: meta?.sources ?? {},
      }),

    // @deprecated — legacy variant actions, removed in Session 4 UI rewrite
    setVariantResults: (data) =>
      set({
        variantA: data.variantA,
        variantB: data.variantB,
        variantC: data.variantC,
        personaValidation: data.personaValidation,
        variantAScore: data.variantAScore,
        variantBScore: data.variantBScore,
        variantCScore: data.variantCScore,
        strategyLayerA: data.strategyLayerA,
        strategyLayerB: data.strategyLayerB,
        strategyLayerC: data.strategyLayerC,
        arenaEnrichment: data.arenaEnrichment ?? null,
      }),
    setVariantFeedback: (variantFeedback) => set({ variantFeedback }),
    setSynthesisFeedback: (synthesisFeedback) => set({ synthesisFeedback }),

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
