// =============================================================
// Canvas Store — Zustand (context + variants + selections + generation + accordion)
// =============================================================

import { create } from 'zustand';
import type { CanvasVariant, CanvasImageVariant, ApprovalStatus } from '../types/canvas.types';
import type { StepSummaryData, StepNumber } from '../types/accordion.types';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
import type { MediumCategory, MediumVariant } from '../types/medium-config.types';
type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error';

export interface SelectedContextItem {
  sourceType: string;
  sourceId: string;
  title: string;
}

interface CanvasStoreState {
  // ─── Context (loaded from server) ─────────────────────────
  contextStack: CanvasContextStack | null;
  deliverableId: string | null;
  contentType: string | null;

  // ─── Variants — Map<group, VariantData[]> ─────────────────
  variantGroups: Map<string, CanvasVariant[]>;

  // ─── Selection — Map<group, selectedIndex> ────────────────
  selections: Map<string, number>;

  // ─── Generation status — Map<group, status> ───────────────
  generationStatus: Map<string, GenerationStatus>;
  globalStatus: GenerationStatus;
  globalErrorMessage: string | null;

  // ─── Image variants ───────────────────────────────────────
  imageVariants: CanvasImageVariant[];

  // ─── Publish suggestion ───────────────────────────────────
  publishSuggestion: { suggestedDate: string; reasoning: string } | null;

  // ─── Panel states ─────────────────────────────────────────
  contextPanelCollapsed: boolean;

  // ─── Additional knowledge context ────────────────────────
  additionalContextItems: Map<string, SelectedContextItem>;
  contextSelectorOpen: boolean;

  // ─── Feedback ─────────────────────────────────────────────
  feedbackDraft: string;
  feedbackGroup: string | null;

  // ─── Approval ───────────────────────────────────────────
  approvalStatus: ApprovalStatus;
  approvalNote: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  publishedAt: string | null;

  // ─── Accordion navigation ─────────────────────────────────
  activeStep: StepNumber;
  completedSteps: Set<number>;
  stepSummaries: Map<number, StepSummaryData>;

  // ─── Step 3: medium generation ────────────────────────────
  mediumGenerationStatus: 'idle' | 'generating' | 'complete' | 'error';
  generatedMediumUrl: string | null;
  mediumApproved: boolean;

  // ─── Step 3: hero image (selected via InsertImageModal) ───
  heroImage: { url: string; mediaAssetId: string | null; alt?: string } | null;
  insertImageModalOpen: boolean;

  // ─── Step 3: medium configuration ──────────────────────────
  mediumCategory: MediumCategory | null;
  mediumConfigValues: Record<string, unknown>;
  mediumVariants: MediumVariant[];
  selectedMediumVariantId: 'A' | 'B' | 'C';
  variantsGenerated: boolean;

  // ─── Content-type-specific inputs ─────────────────────────
  contentTypeInputs: Record<string, string | string[] | number | boolean>;
  contentTypeInputsModified: boolean;

  // ─── SEO Pipeline ────────────────────────────────────────
  seoInput: { primaryKeyword: string; funnelStage: 'awareness' | 'consideration' | 'decision'; competitorUrls: string[] };
  seoSteps: Array<{ step: number; name: string; label: string; status: 'pending' | 'running' | 'complete' | 'error'; preview: string | null }>;
  seoCurrentStep: number | null;

  // ─── Step 4: scheduling ───────────────────────────────────
  scheduledDate: string | null;
  scheduledTime: string | null;
  isTimeBound: boolean;

  // ─── Actions ──────────────────────────────────────────────
  setContextStack: (stack: CanvasContextStack) => void;
  setDeliverable: (id: string, type: string) => void;
  addVariantGroup: (group: string, variants: CanvasVariant[]) => void;
  setSelection: (group: string, index: number) => void;
  setGenerationStatus: (group: string, status: GenerationStatus) => void;
  setGlobalStatus: (status: GenerationStatus, errorMessage?: string) => void;
  setImageVariants: (variants: CanvasImageVariant[]) => void;
  setPublishSuggestion: (suggestion: { suggestedDate: string; reasoning: string } | null) => void;
  toggleContextPanel: () => void;
  setFeedbackDraft: (text: string) => void;
  setFeedbackGroup: (group: string | null) => void;
  toggleContextSelector: () => void;
  setAdditionalContextItems: (items: Map<string, SelectedContextItem>) => void;
  removeContextItem: (key: string) => void;
  setApprovalState: (data: {
    approvalStatus: ApprovalStatus;
    approvalNote?: string | null;
    approvedBy?: string | null;
    approvedAt?: string | null;
    publishedAt?: string | null;
  }) => void;

  // ─── Accordion actions ────────────────────────────────────
  advanceToStep: (step: StepNumber) => void;
  goToStep: (step: StepNumber) => void;
  setStepSummary: (step: number, summary: StepSummaryData) => void;
  setMediumGenerationStatus: (status: 'idle' | 'generating' | 'complete' | 'error') => void;
  setGeneratedMediumUrl: (url: string | null) => void;
  setMediumApproved: (approved: boolean) => void;
  setHeroImage: (image: { url: string; mediaAssetId: string | null; alt?: string } | null) => void;
  setInsertImageModalOpen: (open: boolean) => void;
  setMediumCategory: (category: MediumCategory | null) => void;
  setMediumConfigValue: (key: string, value: unknown) => void;
  setMediumConfigValues: (values: Record<string, unknown>) => void;
  setMediumVariants: (variants: MediumVariant[]) => void;
  setSelectedMediumVariant: (id: 'A' | 'B' | 'C') => void;
  setVariantsGenerated: (generated: boolean) => void;
  setScheduledDate: (date: string | null) => void;
  setScheduledTime: (time: string | null) => void;
  setIsTimeBound: (timeBound: boolean) => void;
  setContentTypeInput: (key: string, value: string | string[] | number | boolean) => void;
  setContentTypeInputsBulk: (inputs: Record<string, string | string[] | number | boolean>) => void;

  // ─── SEO actions ─────────────────────────────────────────
  setSeoInput: (input: Partial<{ primaryKeyword: string; funnelStage: 'awareness' | 'consideration' | 'decision'; competitorUrls: string[] }>) => void;
  initSeoSteps: () => void;
  updateSeoStep: (step: number, update: { status: 'pending' | 'running' | 'complete' | 'error'; preview?: string | null }) => void;

  reset: () => void;
}

const INITIAL_STATE = {
  contextStack: null,
  deliverableId: null,
  contentType: null,
  variantGroups: new Map<string, CanvasVariant[]>(),
  selections: new Map<string, number>(),
  generationStatus: new Map<string, GenerationStatus>(),
  globalStatus: 'idle' as GenerationStatus,
  globalErrorMessage: null as string | null,
  imageVariants: [],
  publishSuggestion: null,
  contextPanelCollapsed: false,
  additionalContextItems: new Map<string, SelectedContextItem>(),
  contextSelectorOpen: false,
  feedbackDraft: '',
  feedbackGroup: null,
  approvalStatus: 'DRAFT' as ApprovalStatus,
  approvalNote: null,
  approvedBy: null,
  approvedAt: null,
  publishedAt: null,

  // Accordion
  activeStep: 1 as StepNumber,
  completedSteps: new Set<number>(),
  stepSummaries: new Map<number, StepSummaryData>(),

  // Step 3
  mediumGenerationStatus: 'idle' as const,
  generatedMediumUrl: null,
  mediumApproved: false,
  mediumCategory: null,
  mediumConfigValues: {},
  mediumVariants: [],
  selectedMediumVariantId: 'B' as const,
  variantsGenerated: false,
  heroImage: null as { url: string; mediaAssetId: string | null; alt?: string } | null,
  insertImageModalOpen: false,

  // Step 4
  scheduledDate: null,
  scheduledTime: null,
  isTimeBound: false,

  // Content-type-specific inputs
  contentTypeInputs: {} as Record<string, string | string[] | number | boolean>,
  contentTypeInputsModified: false,

  // SEO Pipeline
  seoInput: { primaryKeyword: '', funnelStage: 'awareness' as const, competitorUrls: [] as string[] },
  seoSteps: [] as Array<{ step: number; name: string; label: string; status: 'pending' | 'running' | 'complete' | 'error'; preview: string | null }>,
  seoCurrentStep: null as number | null,
};

export const useCanvasStore = create<CanvasStoreState>((set) => ({
  ...INITIAL_STATE,

  setContextStack: (stack) => set({ contextStack: stack }),

  setDeliverable: (id, type) => set({ deliverableId: id, contentType: type }),

  addVariantGroup: (group, variants) =>
    set((state) => {
      const next = new Map(state.variantGroups);
      next.set(group, variants);
      // Auto-select first variant if no selection exists
      const nextSelections = new Map(state.selections);
      if (!nextSelections.has(group)) {
        nextSelections.set(group, 0);
      }
      return { variantGroups: next, selections: nextSelections };
    }),

  setSelection: (group, index) =>
    set((state) => {
      const next = new Map(state.selections);
      next.set(group, index);
      return { selections: next };
    }),

  setGenerationStatus: (group, status) =>
    set((state) => {
      const next = new Map(state.generationStatus);
      next.set(group, status);
      return { generationStatus: next };
    }),

  setGlobalStatus: (status, errorMessage) => set({ globalStatus: status, globalErrorMessage: errorMessage ?? (status === 'error' ? 'An unknown error occurred' : null) }),

  setImageVariants: (variants) => set({ imageVariants: variants }),

  setPublishSuggestion: (suggestion) => set({ publishSuggestion: suggestion }),

  toggleContextPanel: () =>
    set((state) => ({ contextPanelCollapsed: !state.contextPanelCollapsed })),

  setFeedbackDraft: (text) => set({ feedbackDraft: text }),

  setFeedbackGroup: (group) => set({ feedbackGroup: group }),

  toggleContextSelector: () =>
    set((state) => ({ contextSelectorOpen: !state.contextSelectorOpen })),

  setAdditionalContextItems: (items) => set({ additionalContextItems: items }),

  removeContextItem: (key) =>
    set((state) => {
      const next = new Map(state.additionalContextItems);
      next.delete(key);
      return { additionalContextItems: next };
    }),

  setApprovalState: (data) =>
    set({
      approvalStatus: data.approvalStatus,
      approvalNote: data.approvalNote ?? null,
      approvedBy: data.approvedBy ?? null,
      approvedAt: data.approvedAt ?? null,
      publishedAt: data.publishedAt ?? null,
    }),

  // ─── Accordion actions ────────────────────────────────────

  advanceToStep: (step) =>
    set((state) => {
      const nextCompleted = new Set(state.completedSteps);
      // Mark all previous steps as completed
      for (let i = 1; i < step; i++) {
        nextCompleted.add(i);
      }
      return { activeStep: step, completedSteps: nextCompleted };
    }),

  goToStep: (step) =>
    set((state) => {
      // Only allow navigating to completed steps (review mode) or current active
      if (state.completedSteps.has(step) || step === state.activeStep) {
        // Mark the previously active step as completed so user can navigate back
        const nextCompleted = new Set(state.completedSteps);
        if (step !== state.activeStep) {
          nextCompleted.add(state.activeStep);
        }
        return { activeStep: step, completedSteps: nextCompleted };
      }
      return {};
    }),

  setStepSummary: (step, summary) =>
    set((state) => {
      const next = new Map(state.stepSummaries);
      next.set(step, summary);
      return { stepSummaries: next };
    }),

  setMediumGenerationStatus: (status) => set({ mediumGenerationStatus: status }),
  setGeneratedMediumUrl: (url) => set({ generatedMediumUrl: url }),
  setMediumApproved: (approved) => set({ mediumApproved: approved }),
  setHeroImage: (heroImage) => set({ heroImage }),
  setInsertImageModalOpen: (insertImageModalOpen) => set({ insertImageModalOpen }),
  setMediumCategory: (category) => set({ mediumCategory: category }),
  setMediumConfigValue: (key, value) =>
    set((state) => ({
      mediumConfigValues: { ...state.mediumConfigValues, [key]: value },
    })),
  setMediumConfigValues: (values) => set({ mediumConfigValues: values }),
  setMediumVariants: (variants) => set({ mediumVariants: variants }),
  setSelectedMediumVariant: (id) => set({ selectedMediumVariantId: id }),
  setVariantsGenerated: (generated) => set({ variantsGenerated: generated }),
  setScheduledDate: (date) => set({ scheduledDate: date }),
  setScheduledTime: (time) => set({ scheduledTime: time }),
  setIsTimeBound: (timeBound) => set({ isTimeBound: timeBound }),

  setContentTypeInput: (key, value) =>
    set((state) => ({
      contentTypeInputs: { ...state.contentTypeInputs, [key]: value },
      contentTypeInputsModified: true,
    })),

  setContentTypeInputsBulk: (inputs) =>
    set({ contentTypeInputs: inputs, contentTypeInputsModified: false }),

  setSeoInput: (input) =>
    set((state) => ({ seoInput: { ...state.seoInput, ...input } })),

  initSeoSteps: () => {
    set({
      seoSteps: [
        { step: 1, name: 'project_briefing', label: 'Project Briefing', status: 'pending' as const, preview: null },
        { step: 2, name: 'keyword_research', label: 'Keyword Research', status: 'pending' as const, preview: null },
        { step: 3, name: 'competitor_analysis', label: 'Competitor Analysis', status: 'pending' as const, preview: null },
        { step: 4, name: 'serp_gaps_eeat', label: 'SERP Gaps & E-E-A-T', status: 'pending' as const, preview: null },
        { step: 5, name: 'outline_structure', label: 'Outline & Internal Links', status: 'pending' as const, preview: null },
        { step: 6, name: 'first_draft', label: 'First Draft', status: 'pending' as const, preview: null },
        { step: 7, name: 'editorial_review', label: 'Editorial Review', status: 'pending' as const, preview: null },
        { step: 8, name: 'publication_prep', label: 'Publication Prep', status: 'pending' as const, preview: null },
      ],
      seoCurrentStep: null,
    });
  },

  updateSeoStep: (step, update) =>
    set((state) => ({
      seoSteps: state.seoSteps.map((s) =>
        s.step === step ? { ...s, ...update, preview: update.preview ?? s.preview } : s,
      ),
      seoCurrentStep: update.status === 'running' ? step : state.seoCurrentStep,
    })),

  reset: () => set({
    ...INITIAL_STATE,
    // Create fresh instances on reset
    variantGroups: new Map(),
    selections: new Map(),
    generationStatus: new Map(),
    additionalContextItems: new Map(),
    completedSteps: new Set(),
    stepSummaries: new Map(),
    // Reset SEO state
    seoInput: { primaryKeyword: '', funnelStage: 'awareness' as const, competitorUrls: [] },
    seoSteps: [],
    seoCurrentStep: null,
  }),
}));
