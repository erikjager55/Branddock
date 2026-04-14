import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getTimeBinding } from "../lib/goal-types";
import { getRecommendedCampaignType } from "../lib/campaign-types";
import { getStepsForMode } from "../lib/wizard-steps";
import {
  PIPELINE_PRESETS,
  getDefaultPresetForMode,
  type PipelineConfig,
  type StrategyDepth,
  type CreativeRange,
  type ModelRigor,
} from "../lib/pipeline-config";
import type {
  CampaignType,
  CampaignGoalType,
  StrategyResultResponse,
  CampaignBlueprint,
  PipelineStep,
  StrategicIntent,
  CampaignBriefing,
  BriefingSource,
  StrategyPhase,
  StrategyLayer,
  ArchitectureLayer,
  ChannelPlanLayer,
  AssetPlanLayer,
  PersonaValidationResult,
  ArenaEnrichmentTracking,
  EnrichmentSources,
  // ─── 9-Phase Architecture Types ──────────────────────────
  BriefingValidation,
  StrategyFoundation,
  EnrichmentContext,
  // ─── Creative Quality Pipeline Types ──────────────────────
  HumanInsight,
  CreativeConcept,
  DebateRound,
} from "../types/campaign-wizard.types";

// ─── Types ────────────────────────────────────────────────

type WizardMode = 'campaign' | 'content';

interface CampaignWizardState {
  /**
   * Workspace fingerprint. Persisted alongside wizard state to detect when
   * the user has switched workspace/organization since this state was saved.
   * If a mismatch is detected on mount, the wizard state is reset to prevent
   * leaking drafts across workspace boundaries (data isolation).
   */
  workspaceId: string | null;
  /**
   * DB-backed draft ID (Fase 2). Null when no server draft exists yet;
   * set on first auto-save (POST) and reused for subsequent PATCH calls.
   * Cleared when the draft is promoted to an ACTIVE campaign via launch.
   */
  draftCampaignId: string | null;
  /** Live status of the auto-save loop. Not persisted — resets to 'idle' on reload. */
  draftSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  /** ISO timestamp of the most recent successful save. */
  draftLastSavedAt: string | null;
  /** Last error message from auto-save, if any. Cleared on next successful save. */
  draftSaveError: string | null;
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
  /**
   * External reference materials attached to the briefing — web pages,
   * blog posts, social media URLs, or PDF documents. Each is parsed
   * server-side into plain text and injected into AI prompts as
   * additional context. Optional.
   */
  briefingSources: BriefingSource[];

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
  conceptFeedback: string;

  // ─── Enrichment Status (real-time feedback for all sources) ─────────
  enrichmentStatus: 'idle' | 'running' | 'complete' | 'skipped';
  enrichmentBlockCount: number;
  enrichmentQueries: string[];
  enrichmentSources: EnrichmentSources;

  // ─── Concept Step (elaborate result before blueprint assembly) ────
  elaborateResult: { channelPlan: ChannelPlanLayer; assetPlan: AssetPlanLayer } | null;

  // ─── Skip Concept Step ──────────────────────────────────────
  skipConceptStep: boolean;

  // ─── External Enrichment Toggle ──────────────────────────────
  useExternalEnrichment: boolean;

  // ─── Pipeline Configuration ──────────────────────────────────
  /**
   * Controls the depth, breadth and rigor of the generation pipeline.
   * Replaces the old binary pipelineDepth toggle. See pipeline-config.ts.
   */
  pipelineConfig: PipelineConfig;

  // ─── Interactive Feedback (Hook Review) ──────────────────────
  endorsedPersonaIds: string[];
  strategyRatings: Record<string, { rating: 'up' | 'down'; comment?: string }>;

  // ─── Content Generation Step (content mode) ─────────────────
  contentGenPhase: 'idle' | 'launching' | 'generating' | 'complete' | 'error';
  generatedCampaignId: string | null;
  generatedDeliverableId: string | null;
  hasSelectedVariant: boolean;

  // ─── Creative Quality Pipeline ──────────────────────────────
  insights: HumanInsight[];
  selectedInsightIndex: number | null;
  insightFeedback: string;
  concepts: CreativeConcept[];
  selectedConceptIndex: number | null;
  conceptElementRatings: Record<string, { rating: 'up' | 'down'; comment?: string }>;
  creativeDebateResult: { critique: unknown; defense: unknown; improvedConcept: CreativeConcept | null; rounds?: DebateRound[]; finalScore?: number } | null;
  finalStrategy: StrategyLayer | null;
  finalArchitecture: ArchitectureLayer | null;

  // ─── Concept Regeneration ──────────────────────────────────
  pipelineAttempt: number;
  failedConcepts: Array<{ campaignLine: string; whyItFailed: string }>;
  regenerationBrief: string;

  /** Set the workspace fingerprint. Called by useEnsureWizardWorkspace on mount. */
  setWorkspaceId: (id: string | null) => void;
  /** Set the DB-backed draft ID after first POST. Called by useDraftAutoSave. */
  setDraftCampaignId: (id: string | null) => void;
  /** Update the auto-save loop status. Called by useDraftAutoSave. */
  setDraftSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error', error?: string | null) => void;
  /** Update the last saved timestamp after a successful save. */
  setDraftLastSavedAt: (ts: string | null) => void;
  /**
   * Hydrate the wizard from a server draft payload. Used by the "Resume draft"
   * flow. Resets all ephemeral fields, merges the persisted snapshot into state,
   * and marks the draft as linked (draftCampaignId set, status 'saved').
   */
  loadDraft: (payload: { campaignId: string; wizardState: Record<string, unknown>; wizardStep: number; lastSavedAt: string | null }) => void;
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
  addBriefingSource: (source: BriefingSource) => void;
  updateBriefingSource: (id: string, patch: Partial<BriefingSource>) => void;
  removeBriefingSource: (id: string) => void;

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
  // ─── Enrichment Status Actions ──────────────────────────────
  setEnrichmentStatus: (status: 'idle' | 'running' | 'complete' | 'skipped', meta?: { totalBlocks?: number; queries?: string[]; sources?: EnrichmentSources }) => void;

  setConceptFeedback: (feedback: string) => void;

  // ─── Concept Step Actions ─────────────────────────────────
  setElaborateResult: (result: { channelPlan: ChannelPlanLayer; assetPlan: AssetPlanLayer } | null) => void;

  // ─── Skip Concept Step Actions ──────────────────────────────
  setSkipConceptStep: (skip: boolean) => void;

  // ─── External Enrichment Actions ─────────────────────────────
  setUseExternalEnrichment: (enabled: boolean) => void;

  // ─── Pipeline Configuration Actions ──────────────────────────
  setPipelineConfig: (config: PipelineConfig) => void;
  setStrategyDepth: (depth: StrategyDepth) => void;
  setCreativeRange: (range: CreativeRange) => void;
  setModelRigor: (rigor: ModelRigor) => void;
  /**
   * Snap all three parameters to a named preset's values. Pass 'quick',
   * 'standard' or 'award-grade'. Use this from preset buttons.
   */
  applyPipelinePreset: (preset: 'quick' | 'standard' | 'award-grade') => void;

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
  setCreativeDebateResult: (result: { critique: unknown; defense: unknown; improvedConcept: CreativeConcept | null; rounds?: DebateRound[]; finalScore?: number }) => void;
  setFinalStrategyResult: (data: { strategy: StrategyLayer; architecture: ArchitectureLayer }) => void;

  // ─── Content Generation Step Actions ─────────────────────────
  setContentGenPhase: (phase: 'idle' | 'launching' | 'generating' | 'complete' | 'error') => void;
  setGeneratedIds: (campaignId: string, deliverableId: string) => void;
  setHasSelectedVariant: (v: boolean) => void;

  // ─── Concept Regeneration Actions ─────────────────────────
  setPipelineAttempt: (attempt: number) => void;
  addFailedConcept: (campaignLine: string, whyItFailed: string) => void;
  setRegenerationBrief: (brief: string) => void;
}

// ─── Initial state ────────────────────────────────────────

const INITIAL_STATE = {
  workspaceId: null as string | null,
  draftCampaignId: null as string | null,
  draftSaveStatus: 'idle' as 'idle' | 'saving' | 'saved' | 'error',
  draftLastSavedAt: null as string | null,
  draftSaveError: null as string | null,
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
  briefingSources: [] as BriefingSource[],

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
  conceptFeedback: "",

  // ─── Enrichment Status ──────────────────────────────────────
  enrichmentStatus: 'idle' as 'idle' | 'running' | 'complete' | 'skipped',
  enrichmentBlockCount: 0,
  enrichmentQueries: [] as string[],
  enrichmentSources: {} as EnrichmentSources,

  // ─── Concept Step ─────────────────────────────────────────────
  elaborateResult: null as { channelPlan: ChannelPlanLayer; assetPlan: AssetPlanLayer } | null,

  // ─── Skip Concept Step ──────────────────────────────────────
  skipConceptStep: false,

  // ─── External Enrichment (always enabled, auto-detected) ──────────────────────────────
  useExternalEnrichment: true,

  // ─── Pipeline Configuration ──────────────────────────────────
  // Defaults to Standard (campaign mode default). Overridden to Quick by
  // App.tsx onNavigateToContentWizard when content mode is chosen.
  pipelineConfig: PIPELINE_PRESETS.standard as PipelineConfig,

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
  finalStrategy: null as StrategyLayer | null,
  finalArchitecture: null as ArchitectureLayer | null,

  // ─── Concept Regeneration ─────────────────────────────────
  pipelineAttempt: 1,
  failedConcepts: [] as Array<{ campaignLine: string; whyItFailed: string }>,
  regenerationBrief: '',

  // ─── Content Generation Step ─────────────────────────────────
  contentGenPhase: 'idle' as 'idle' | 'launching' | 'generating' | 'complete' | 'error',
  generatedCampaignId: null as string | null,
  generatedDeliverableId: null as string | null,
  hasSelectedVariant: false,
};

// ─── Store ────────────────────────────────────────────────

export const useCampaignWizardStore = create<CampaignWizardState>()(
  persist(
    (set, get) => ({
    ...INITIAL_STATE,

    setWorkspaceId: (workspaceId) => set({ workspaceId }),
    setDraftCampaignId: (draftCampaignId) => set({ draftCampaignId }),
    setDraftSaveStatus: (draftSaveStatus, error = null) =>
      set({
        draftSaveStatus,
        draftSaveError: draftSaveStatus === 'error' ? error : null,
      }),
    setDraftLastSavedAt: (draftLastSavedAt) => set({ draftLastSavedAt }),
    loadDraft: ({ campaignId, wizardState, wizardStep, lastSavedAt }) => {
      // Preserve the current workspace fingerprint — the server snapshot
      // excludes workspaceId (it's implicit in the session cookie), and
      // useEnsureWizardWorkspace won't re-stamp after mount unless the
      // workspace selector itself changes.
      const currentWorkspaceId = get().workspaceId;
      set({
        ...INITIAL_STATE,
        ...(wizardState as Partial<CampaignWizardState>),
        workspaceId: currentWorkspaceId,
        draftCampaignId: campaignId,
        currentStep: wizardStep,
        draftSaveStatus: 'saved',
        draftLastSavedAt: lastSavedAt,
        draftSaveError: null,
        // Defensive: clear non-serializable field (must be null after load)
        stepProceedOverride: null,
      });
    },
    setCurrentStep: (step) => set({ currentStep: step }),
    setWizardMode: (wizardMode) =>
      set({
        wizardMode,
        // Reset to the mode's default pipeline preset on mode switch.
        // Users who want a custom config can still tweak the sliders after.
        pipelineConfig: getDefaultPresetForMode(wizardMode),
      }),
    nextStep: () =>
      set((s) => {
        const maxStep = getStepsForMode(s.wizardMode).length;
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
      const steps = getStepsForMode(state.wizardMode);
      const stepDef = steps[state.currentStep - 1];
      if (!stepDef) return false;
      return stepDef.canProceed(state);
    },

    allRationaleRated: () => {
      // CQP pipeline: no element-level ratings in foundation review
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
    addBriefingSource: (source) =>
      set((s) => ({ briefingSources: [...s.briefingSources, source] })),
    updateBriefingSource: (id, patch) =>
      set((s) => ({
        briefingSources: s.briefingSources.map((src) =>
          src.id === id ? { ...src, ...patch } : src,
        ),
      })),
    removeBriefingSource: (id) =>
      set((s) => ({
        briefingSources: s.briefingSources.filter((src) => src.id !== id),
      })),

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
        finalStrategy: null,
        finalArchitecture: null,
        // Concept Regeneration
        pipelineAttempt: 1,
        failedConcepts: [],
        regenerationBrief: '',
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
        finalStrategy: null,
        finalArchitecture: null,
        // Concept Regeneration
        pipelineAttempt: 1,
        failedConcepts: [],
        regenerationBrief: '',
        // Content generation step
        contentGenPhase: 'idle',
        generatedCampaignId: null,
        generatedDeliverableId: null,
        hasSelectedVariant: false,
      }),

    // ─── 9-Phase Architecture Actions ─────────────────────────
    setBriefingValidation: (briefingValidation) => set({ briefingValidation }),
    setStrategyFoundation: (strategyFoundation) => set({ strategyFoundation }),
    setStrategyFeedback: (strategyFeedback) => set({ strategyFeedback }),
    setEnrichmentContext: (enrichmentContext) => set({ enrichmentContext }),
    // ─── Enrichment Status Actions ──────────────────────────────
    setEnrichmentStatus: (status, meta) =>
      set({
        enrichmentStatus: status,
        enrichmentBlockCount: meta?.totalBlocks ?? 0,
        enrichmentQueries: meta?.queries ?? [],
        enrichmentSources: meta?.sources ?? {},
      }),

    setConceptFeedback: (conceptFeedback) => set({ conceptFeedback }),

    // ─── Concept Step Actions ─────────────────────────────────
    setElaborateResult: (elaborateResult) => set({ elaborateResult }),

    // ─── External Enrichment Actions ─────────────────────────────
    setSkipConceptStep: (skipConceptStep) => set({ skipConceptStep }),
    setUseExternalEnrichment: (useExternalEnrichment) => set({ useExternalEnrichment }),

    // ─── Pipeline Configuration Actions ──────────────────────────
    setPipelineConfig: (pipelineConfig) => set({ pipelineConfig }),
    setStrategyDepth: (strategyDepth) =>
      set((s) => ({ pipelineConfig: { ...s.pipelineConfig, strategyDepth } })),
    setCreativeRange: (creativeRange) =>
      set((s) => ({ pipelineConfig: { ...s.pipelineConfig, creativeRange } })),
    setModelRigor: (modelRigor) =>
      set((s) => ({ pipelineConfig: { ...s.pipelineConfig, modelRigor } })),
    applyPipelinePreset: (preset) =>
      set({ pipelineConfig: { ...PIPELINE_PRESETS[preset] } }),

    // ─── Step Proceed Override ──────────────────────────────────
    setStepProceedOverride: (fn) => set({ stepProceedOverride: fn }),

    // ─── Content Generation Step Actions ─────────────────────────
    setContentGenPhase: (contentGenPhase) => set({ contentGenPhase }),
    setGeneratedIds: (generatedCampaignId, generatedDeliverableId) =>
      set({ generatedCampaignId, generatedDeliverableId }),
    setHasSelectedVariant: (hasSelectedVariant) => set({ hasSelectedVariant }),

    // ─── Concept Regeneration Actions ─────────────────────────
    setPipelineAttempt: (attempt) => set({ pipelineAttempt: attempt }),
    addFailedConcept: (campaignLine, whyItFailed) =>
      set((s) => ({
        failedConcepts: [...s.failedConcepts, { campaignLine, whyItFailed }],
      })),
    setRegenerationBrief: (brief) => set({ regenerationBrief: brief }),

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
    {
      name: "branddock-campaign-wizard-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Only persist user-meaningful wizard data. Transient flags (isGenerating,
      // pipelineSteps, enrichmentStatus, contentGenPhase) and non-serializable
      // fields (stepProceedOverride function) fall back to INITIAL_STATE on rehydrate.
      partialize: (state) => ({
        // Workspace fingerprint — first field so it's always loaded before any
        // mismatch check can run. See useEnsureWizardWorkspace hook.
        workspaceId: state.workspaceId,
        // DB-backed draft link (Fase 2). Persisted so the link survives refresh
        // and the auto-save loop continues with PATCH instead of POSTing a new draft.
        // Note: draftSaveStatus / draftLastSavedAt / draftSaveError are transient
        // and intentionally fall back to INITIAL_STATE on rehydrate.
        draftCampaignId: state.draftCampaignId,
        wizardMode: state.wizardMode,
        currentStep: state.currentStep,
        name: state.name,
        description: state.description,
        campaignGoalType: state.campaignGoalType,
        campaignType: state.campaignType,
        selectedContentType: state.selectedContentType,
        startDate: state.startDate,
        endDate: state.endDate,
        selectedKnowledgeIds: state.selectedKnowledgeIds,
        strategyResult: state.strategyResult,
        selectedDeliverables: state.selectedDeliverables,
        activeDeliverableTab: state.activeDeliverableTab,
        saveAsTemplate: state.saveAsTemplate,
        templateName: state.templateName,
        briefingOccasion: state.briefingOccasion,
        briefingAudienceObjective: state.briefingAudienceObjective,
        briefingCoreMessage: state.briefingCoreMessage,
        briefingTonePreference: state.briefingTonePreference,
        briefingConstraints: state.briefingConstraints,
        briefingSources: state.briefingSources,
        strategicIntent: state.strategicIntent,
        blueprintResult: state.blueprintResult,
        strategyPhase: state.strategyPhase,
        personaValidation: state.personaValidation,
        synthesizedStrategy: state.synthesizedStrategy,
        synthesizedArchitecture: state.synthesizedArchitecture,
        arenaEnrichment: state.arenaEnrichment,
        briefingValidation: state.briefingValidation,
        strategyFoundation: state.strategyFoundation,
        strategyFeedback: state.strategyFeedback,
        enrichmentContext: state.enrichmentContext,
        conceptFeedback: state.conceptFeedback,
        elaborateResult: state.elaborateResult,
        useExternalEnrichment: state.useExternalEnrichment,
        pipelineConfig: state.pipelineConfig,
        endorsedPersonaIds: state.endorsedPersonaIds,
        strategyRatings: state.strategyRatings,
        generatedCampaignId: state.generatedCampaignId,
        generatedDeliverableId: state.generatedDeliverableId,
        hasSelectedVariant: state.hasSelectedVariant,
        insights: state.insights,
        selectedInsightIndex: state.selectedInsightIndex,
        insightFeedback: state.insightFeedback,
        concepts: state.concepts,
        selectedConceptIndex: state.selectedConceptIndex,
        conceptElementRatings: state.conceptElementRatings,
        creativeDebateResult: state.creativeDebateResult,
        finalStrategy: state.finalStrategy,
        finalArchitecture: state.finalArchitecture,
        pipelineAttempt: state.pipelineAttempt,
        failedConcepts: state.failedConcepts,
        regenerationBrief: state.regenerationBrief,
      }),
      // Recover from in-flight pipeline phases. Without this, refreshing during
      // e.g. mining_insights would leave the UI in a "spinner without isGenerating"
      // dead state because isGenerating is excluded from partialize.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        switch (state.strategyPhase) {
          case 'validating_briefing':
            state.strategyPhase = 'idle';
            break;
          case 'building_foundation':
            state.strategyPhase = state.briefingValidation ? 'review_briefing' : 'idle';
            break;
          case 'mining_insights':
            state.strategyPhase = state.insights.length > 0 ? 'review_insights' : 'rationale_complete';
            break;
          case 'generating_concepts':
            state.strategyPhase = state.concepts.length > 0 ? 'review_concepts' : 'review_insights';
            break;
          case 'creative_debate':
          case 'building_strategy':
            state.strategyPhase = 'review_concepts';
            break;
          case 'generating_journey':
            state.strategyPhase = state.synthesizedStrategy ? 'review_final_strategy' : 'review_concepts';
            break;
        }
      },
    },
  ),
);
