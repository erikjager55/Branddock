import { create } from "zustand";
import { getTimeBinding } from "../lib/goal-types";
import { getRecommendedCampaignType } from "../lib/campaign-types";
import type {
  CampaignType,
  CampaignGoalType,
  StrategyResultResponse,
  CampaignBlueprint,
  PipelineStep,
  StrategicIntent,
  CampaignBriefing,
  StrategyPhase,
  StrategyLayer,
  ArchitectureLayer,
  ChannelPlanLayer,
  AssetPlanLayer,
  PersonaValidationResult,
  ArenaEnrichmentTracking,
  EnrichmentSources,
  // ─── Multi-Agent Strategy Debate Types ─────────────────────
  AgentCritique,
  AgentDefense,
  PersonaDebateResult,
  AgentDebateState,
  AgentRoundName,
  DebateViewMode,
  // ─── 9-Phase Architecture Types ──────────────────────────
  CreativeHook,
  BriefingValidation,
  StrategyFoundation,
  EnrichmentContext,
  CuratorSelection,
  HookConcept,
  // ─── Creative Quality Pipeline Types ──────────────────────
  HumanInsight,
  CreativeConcept,
  ConceptVisual,
} from "../types/campaign-wizard.types";

// ─── Types ────────────────────────────────────────────────

type WizardMode = 'campaign' | 'content';

interface CampaignWizardState {
  wizardMode: WizardMode;
  currentStep: number;
  name: string;
  description: string;
  campaignGoalType: CampaignGoalType | null;
  campaignType: CampaignType | null;
  /** In content mode: the selected deliverable type ID (e.g. 'linkedin-post') */
  selectedContentType: string | null;
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
  conceptFeedback: string;

  // ─── Enrichment Status (real-time feedback for all sources) ─────────
  enrichmentStatus: 'idle' | 'running' | 'complete' | 'skipped';
  enrichmentBlockCount: number;
  enrichmentQueries: string[];
  enrichmentSources: EnrichmentSources;

  // ─── Concept Step (elaborate result before blueprint assembly) ────
  elaborateResult: { channelPlan: ChannelPlanLayer; assetPlan: AssetPlanLayer } | null;

  // ─── External Enrichment Toggle ──────────────────────────────
  useExternalEnrichment: boolean;

  // ─── Multi-Agent Strategy Debate (used by creative-debate pipeline) ─────
  agentDebateRounds: AgentDebateState[];
  critiqueOfA: AgentCritique | null;
  critiqueOfB: AgentCritique | null;
  defenseA: AgentDefense | null;
  defenseB: AgentDefense | null;
  personaDebate: PersonaDebateResult[] | null;
  debateViewMode: DebateViewMode;

  // ─── Interactive Feedback (Hook Review) ──────────────────────
  endorsedPersonaIds: string[];
  strategyRatings: Record<string, { rating: 'up' | 'down'; comment?: string }>;

  // ─── Creative Quality Pipeline ──────────────────────────────
  insights: HumanInsight[];
  selectedInsightIndex: number | null;
  insightFeedback: string;
  concepts: CreativeConcept[];
  selectedConceptIndex: number | null;
  conceptElementRatings: Record<string, { rating: 'up' | 'down'; comment?: string }>;
  creativeDebateResult: { critique: unknown; defense: unknown; improvedConcept: CreativeConcept | null } | null;
  conceptVisuals: ConceptVisual[];
  finalStrategy: StrategyLayer | null;
  finalArchitecture: ArchitectureLayer | null;

  setWizardMode: (mode: WizardMode) => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setName: (name: string) => void;
  setDescription: (desc: string) => void;
  setCampaignGoalType: (type: CampaignGoalType) => void;
  setCampaignType: (type: CampaignType) => void;
  setSelectedContentType: (typeId: string) => void;
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
  allRationaleRated: () => boolean;
  allConceptRated: () => boolean;
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
  setConceptFeedback: (feedback: string) => void;

  // ─── Concept Step Actions ─────────────────────────────────
  setElaborateResult: (result: { channelPlan: ChannelPlanLayer; assetPlan: AssetPlanLayer } | null) => void;

  // ─── External Enrichment Actions ─────────────────────────────
  setUseExternalEnrichment: (enabled: boolean) => void;

  // ─── Multi-Agent Strategy Debate Actions (used by creative-debate pipeline) ─────
  updateDebateRound: (round: AgentDebateState) => void;
  setCritique: (variant: 'A' | 'B', critique: AgentCritique) => void;
  setDefense: (variant: 'A' | 'B', defense: AgentDefense) => void;
  setPersonaDebate: (results: PersonaDebateResult[]) => void;
  setDebateViewMode: (mode: DebateViewMode) => void;

  // ─── Step Proceed Override ──────────────────────────────────
  /** When set, the wizard Continue button calls this instead of nextStep(). Cleared on step change. */
  stepProceedOverride: (() => void) | null;
  setStepProceedOverride: (fn: (() => void) | null) => void;

  // ─── Interactive Feedback Actions ─────────────────────────
  togglePersonaEndorsement: (personaId: string) => void;
  setStrategyRating: (key: string, rating: 'up' | 'down' | null) => void;
  setStrategyRatingComment: (key: string, comment: string) => void;

  // ─── Creative Quality Pipeline Actions ─────────────────────
  setInsightResults: (insights: HumanInsight[]) => void;
  setSelectedInsight: (index: number | null) => void;
  setInsightFeedback: (feedback: string) => void;
  setConceptResults: (concepts: CreativeConcept[]) => void;
  setSelectedConcept: (index: number | null) => void;
  setConceptElementRating: (key: string, rating: 'up' | 'down', comment?: string) => void;
  setCreativeDebateResult: (result: { critique: unknown; defense: unknown; improvedConcept: CreativeConcept | null }) => void;
  setConceptVisuals: (visuals: ConceptVisual[]) => void;
  setFinalStrategyResult: (data: { strategy: StrategyLayer; architecture: ArchitectureLayer }) => void;
}

// ─── Initial state ────────────────────────────────────────

const INITIAL_STATE = {
  wizardMode: 'campaign' as WizardMode,
  currentStep: 1,
  name: "",
  description: "",
  campaignGoalType: null as CampaignGoalType | null,
  campaignType: null as CampaignType | null,
  selectedContentType: null as string | null,
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
  conceptFeedback: "",

  // ─── Enrichment Status ──────────────────────────────────────
  enrichmentStatus: 'idle' as 'idle' | 'running' | 'complete' | 'skipped',
  enrichmentBlockCount: 0,
  enrichmentQueries: [] as string[],
  enrichmentSources: {} as EnrichmentSources,

  // ─── Concept Step ─────────────────────────────────────────────
  elaborateResult: null as { channelPlan: ChannelPlanLayer; assetPlan: AssetPlanLayer } | null,

  // ─── External Enrichment (always enabled, auto-detected) ──────────────────────────────
  useExternalEnrichment: true,

  // ─── Multi-Agent Strategy Debate (used by creative-debate pipeline) ─────
  agentDebateRounds: [] as AgentDebateState[],
  critiqueOfA: null as AgentCritique | null,
  critiqueOfB: null as AgentCritique | null,
  defenseA: null as AgentDefense | null,
  defenseB: null as AgentDefense | null,
  personaDebate: null as PersonaDebateResult[] | null,
  debateViewMode: 'timeline' as DebateViewMode,

  // ─── Interactive Feedback (Hook Review) ──────────────────────
  endorsedPersonaIds: [] as string[],
  strategyRatings: {} as Record<string, { rating: 'up' | 'down'; comment?: string }>,

  // ─── Step Proceed Override ──────────────────────────────────
  stepProceedOverride: null as (() => void) | null,

  // ─── Creative Quality Pipeline ──────────────────────────────
  insights: [] as HumanInsight[],
  selectedInsightIndex: null as number | null,
  insightFeedback: "",
  concepts: [] as CreativeConcept[],
  selectedConceptIndex: null as number | null,
  conceptElementRatings: {} as Record<string, { rating: 'up' | 'down'; comment?: string }>,
  creativeDebateResult: null as { critique: unknown; defense: unknown; improvedConcept: CreativeConcept | null } | null,
  conceptVisuals: [] as ConceptVisual[],
  finalStrategy: null as StrategyLayer | null,
  finalArchitecture: null as ArchitectureLayer | null,
};

// ─── Store ────────────────────────────────────────────────

export const useCampaignWizardStore = create<CampaignWizardState>(
  (set, get) => ({
    ...INITIAL_STATE,

    setCurrentStep: (step) => set({ currentStep: step }),
    setWizardMode: (wizardMode) => set({ wizardMode }),
    nextStep: () =>
      set((s) => {
        const maxStep = s.wizardMode === 'content' ? 4 : 6;
        return { currentStep: Math.min(maxStep, s.currentStep + 1) };
      }),
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
      // Auto-recommend campaign type if not manually set yet
      if (get().campaignType === null) {
        updates.campaignType = getRecommendedCampaignType(campaignGoalType);
      }
      set(updates);
    },
    setCampaignType: (campaignType) => set({ campaignType }),
    setSelectedContentType: (selectedContentType) => set({ selectedContentType }),
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
      const isContent = state.wizardMode === 'content';
      switch (state.currentStep) {
        case 1: {
          const hasName = state.name.trim().length > 0;
          if (isContent) {
            return hasName && state.selectedContentType !== null;
          }
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
        case 3: {
          // Allow proceeding from briefing review when score >= 80 (triggers foundation build)
          if (state.strategyPhase === 'review_briefing') {
            return (state.briefingValidation?.overallScore ?? 0) >= 80;
          }
          // Strategy foundation building in progress
          if (state.strategyPhase === 'building_foundation') return false;
          if (state.strategyPhase === 'validating_briefing') return false;
          if (state.strategyPhase === 'review_strategy') return false; // user must click "Approve" in the review view
          // Strategy complete — can proceed to Concept step
          return state.strategyPhase === 'rationale_complete';
        }
        case 4: {
          // Creative Quality Pipeline phases (insight mining → concepts → hooks → journey)
          if (state.strategyPhase === 'mining_insights') return false;
          if (state.strategyPhase === 'review_insights') return state.selectedInsightIndex !== null;
          if (state.strategyPhase === 'generating_concepts') return false;
          if (state.strategyPhase === 'review_concepts') return state.selectedConceptIndex !== null;
          if (state.strategyPhase === 'building_strategy') return false;
          if (state.strategyPhase === 'review_final_strategy') return state.finalStrategy !== null;
          if (state.strategyPhase === 'creative_debate') return false;
          if (state.strategyPhase === 'review_debate') return true;
          // Hook/proposal/journey phases
          if (state.strategyPhase === 'generating_hooks') return false;
          if (state.strategyPhase === 'review_hooks') return false; // handled by stepProceedOverride
          if (state.strategyPhase === 'generating_proposal') return false;
          if (state.strategyPhase === 'review_proposal') return true;
          // Complete
          return state.strategyPhase === 'complete' && state.blueprintResult !== null;
        }
        case 5:
          return state.selectedDeliverables.length > 0;
        case 6:
          return true;
        default:
          return false;
      }
    },

    allRationaleRated: () => {
      const state = get();
      const { strategyRatings } = state;

      // 9-Phase pipeline: no element-level ratings in foundation review
      // Detection aligned with ConceptStep's is9Phase check
      if (state.strategyFoundation !== null && state.enrichmentContext !== null) {
        return true;
      }

      // Legacy pipeline: check all 3 variant strategy layers
      const variants = [
        { key: 'A', layer: state.strategyLayerA },
        { key: 'B', layer: state.strategyLayerB },
        { key: 'C', layer: state.strategyLayerC },
      ] as const;

      const presentVariants = variants.filter((v): v is typeof v & { layer: StrategyLayer } => v.layer !== null);
      if (presentVariants.length === 0) return false;

      for (const { key, layer } of presentVariants) {
        // Always-present fields
        const keys: string[] = [
          `${key}.theme`,
          `${key}.positioning`,
        ];
        // Optional keys (only if the field has content)
        if (layer.humanInsight) keys.push(`${key}.humanInsight`);
        if (layer.culturalTension) keys.push(`${key}.culturalTension`);
        const mh = layer.messagingHierarchy ?? { brandMessage: '', campaignMessage: '', proofPoints: [] };
        if (mh.brandMessage) keys.push(`${key}.messaging.brand`);
        if (mh.campaignMessage) keys.push(`${key}.messaging.campaign`);
        if (mh.proofPoints?.length > 0) keys.push(`${key}.messaging.proofPoints`);
        const jtbd = layer.jtbdFraming ?? { jobStatement: '', functionalJob: '', emotionalJob: '', socialJob: '' };
        if (jtbd.jobStatement) keys.push(`${key}.jtbd.statement`);
        // Dynamic keys (strategic choices)
        const choices = layer.strategicChoices ?? [];
        choices.forEach((_, i) => keys.push(`${key}.choice.${i}`));

        if (!keys.every((k) => !!strategyRatings[k])) return false;
      }

      return true;
    },

    allConceptRated: () => {
      const state = get();
      const strategy = state.synthesizedStrategy;
      if (!strategy) return false;

      const conceptFields: Array<{ key: string; field: keyof StrategyLayer }> = [
        { key: 'concept.creativePlatform', field: 'creativePlatform' },
        { key: 'concept.creativeTerritory', field: 'creativeTerritory' },
        { key: 'concept.brandRole', field: 'brandRole' },
        { key: 'concept.memorableDevice', field: 'memorableDevice' },
        { key: 'concept.campaignTheme', field: 'campaignTheme' },
        { key: 'concept.effieRationale', field: 'effieRationale' },
      ];

      const presentKeys = conceptFields.filter(({ field }) => !!strategy[field]);
      if (presentKeys.length === 0) return false;

      return presentKeys.every(({ key }) => !!state.strategyRatings[key]);
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
        elaborateResult: null,
        pipelineSteps: [],
        currentPipelineStep: 0,
        pipelineError: null,
        enrichmentStatus: 'idle',
        enrichmentBlockCount: 0,
        enrichmentQueries: [],
        enrichmentSources: {},
        // Creative Quality Pipeline
        insights: [],
        selectedInsightIndex: null,
        insightFeedback: "",
        concepts: [],
        selectedConceptIndex: null,
        conceptElementRatings: {},
        creativeDebateResult: null,
        conceptVisuals: [],
        finalStrategy: null,
        finalArchitecture: null,
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
        // Multi-agent debate fields
        agentDebateRounds: [],
        critiqueOfA: null,
        critiqueOfB: null,
        defenseA: null,
        defenseB: null,
        personaDebate: null,
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
        conceptFeedback: "",
        // Concept step
        elaborateResult: null,
        // Creative Quality Pipeline
        insights: [],
        selectedInsightIndex: null,
        insightFeedback: "",
        concepts: [],
        selectedConceptIndex: null,
        conceptElementRatings: {},
        creativeDebateResult: null,
        conceptVisuals: [],
        finalStrategy: null,
        finalArchitecture: null,
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
    setConceptFeedback: (conceptFeedback) => set({ conceptFeedback }),

    // ─── Concept Step Actions ─────────────────────────────────
    setElaborateResult: (elaborateResult) => set({ elaborateResult }),

    // ─── External Enrichment Actions ─────────────────────────────
    setUseExternalEnrichment: (useExternalEnrichment) => set({ useExternalEnrichment }),

    // ─── Step Proceed Override ──────────────────────────────────
    // ─── Multi-Agent Strategy Debate Actions (used by creative-debate pipeline) ─────
    updateDebateRound: (round) =>
      set((s) => {
        const existing = s.agentDebateRounds.findIndex((r) => r.round === round.round);
        const rounds = [...s.agentDebateRounds];
        if (existing >= 0) {
          rounds[existing] = round;
        } else {
          rounds.push(round);
        }
        return { agentDebateRounds: rounds };
      }),
    setCritique: (variant, critique) =>
      set(variant === 'A' ? { critiqueOfA: critique } : { critiqueOfB: critique }),
    setDefense: (variant, defense) =>
      set(variant === 'A' ? { defenseA: defense } : { defenseB: defense }),
    setPersonaDebate: (results) => set({ personaDebate: results }),
    setDebateViewMode: (mode) => set({ debateViewMode: mode }),

    setStepProceedOverride: (fn) => set({ stepProceedOverride: fn }),

    // ─── Creative Quality Pipeline Actions ─────────────────────
    setInsightResults: (insights) => set({ insights }),
    setSelectedInsight: (selectedInsightIndex) => set({ selectedInsightIndex }),
    setInsightFeedback: (insightFeedback) => set({ insightFeedback }),
    setConceptResults: (concepts) => set({ concepts }),
    setSelectedConcept: (selectedConceptIndex) => set({ selectedConceptIndex }),
    setConceptElementRating: (key, rating, comment) =>
      set((s) => ({
        conceptElementRatings: {
          ...s.conceptElementRatings,
          [key]: { rating, comment: comment || undefined },
        },
      })),
    setCreativeDebateResult: (creativeDebateResult) => set({ creativeDebateResult }),
    setConceptVisuals: (conceptVisuals) => set({ conceptVisuals }),
    setFinalStrategyResult: (data) =>
      set({
        finalStrategy: data.strategy,
        finalArchitecture: data.architecture,
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
          const existing = next[key];
          next[key] = { rating, comment: existing?.comment };
        }
        return { strategyRatings: next };
      }),
    setStrategyRatingComment: (key, comment) =>
      set((s) => {
        const existing = s.strategyRatings[key];
        if (!existing) return s;
        return {
          strategyRatings: {
            ...s.strategyRatings,
            [key]: { ...existing, comment: comment || undefined },
          },
        };
      }),
  }),
);
