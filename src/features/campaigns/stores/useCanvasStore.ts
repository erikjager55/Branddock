// =============================================================
// Canvas Store — Zustand (context + variants + selections + generation)
// =============================================================

import { create } from 'zustand';
import type { CanvasVariant, CanvasImageVariant, ApprovalStatus } from '../types/canvas.types';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error';

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

  // ─── Image variants ───────────────────────────────────────
  imageVariants: CanvasImageVariant[];

  // ─── Publish suggestion ───────────────────────────────────
  publishSuggestion: { suggestedDate: string; reasoning: string } | null;

  // ─── Panel states ─────────────────────────────────────────
  contextPanelCollapsed: boolean;

  // ─── Feedback ─────────────────────────────────────────────
  feedbackDraft: string;
  feedbackGroup: string | null;

  // ─── Approval ───────────────────────────────────────────
  approvalStatus: ApprovalStatus;
  approvalNote: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  publishedAt: string | null;

  // ─── Actions ──────────────────────────────────────────────
  setContextStack: (stack: CanvasContextStack) => void;
  setDeliverable: (id: string, type: string) => void;
  addVariantGroup: (group: string, variants: CanvasVariant[]) => void;
  setSelection: (group: string, index: number) => void;
  setGenerationStatus: (group: string, status: GenerationStatus) => void;
  setGlobalStatus: (status: GenerationStatus) => void;
  setImageVariants: (variants: CanvasImageVariant[]) => void;
  setPublishSuggestion: (suggestion: { suggestedDate: string; reasoning: string } | null) => void;
  toggleContextPanel: () => void;
  setFeedbackDraft: (text: string) => void;
  setFeedbackGroup: (group: string | null) => void;
  setApprovalState: (data: {
    approvalStatus: ApprovalStatus;
    approvalNote?: string | null;
    approvedBy?: string | null;
    approvedAt?: string | null;
    publishedAt?: string | null;
  }) => void;
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
  imageVariants: [],
  publishSuggestion: null,
  contextPanelCollapsed: false,
  feedbackDraft: '',
  feedbackGroup: null,
  approvalStatus: 'DRAFT' as ApprovalStatus,
  approvalNote: null,
  approvedBy: null,
  approvedAt: null,
  publishedAt: null,
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

  setGlobalStatus: (status) => set({ globalStatus: status }),

  setImageVariants: (variants) => set({ imageVariants: variants }),

  setPublishSuggestion: (suggestion) => set({ publishSuggestion: suggestion }),

  toggleContextPanel: () =>
    set((state) => ({ contextPanelCollapsed: !state.contextPanelCollapsed })),

  setFeedbackDraft: (text) => set({ feedbackDraft: text }),

  setFeedbackGroup: (group) => set({ feedbackGroup: group }),

  setApprovalState: (data) =>
    set({
      approvalStatus: data.approvalStatus,
      approvalNote: data.approvalNote ?? null,
      approvedBy: data.approvedBy ?? null,
      approvedAt: data.approvedAt ?? null,
      publishedAt: data.publishedAt ?? null,
    }),

  reset: () => set({
    ...INITIAL_STATE,
    // Create fresh Map instances on reset
    variantGroups: new Map(),
    selections: new Map(),
    generationStatus: new Map(),
  }),
}));
