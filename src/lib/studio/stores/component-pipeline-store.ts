// =============================================================
// Component Pipeline Zustand Store — manages pipeline state
// =============================================================

import { create } from 'zustand';
import type {
  PipelineStatusType,
  ComponentStatusType,
  DeliverableComponentState,
  BriefReviewData,
  MasterMessage,
  ImageSourceType,
  PipelineProgress,
} from '@/types/studio';

interface ComponentPipelineState {
  // Pipeline state
  pipelineStatus: PipelineStatusType;
  components: DeliverableComponentState[];
  activeComponentId: string | null;
  deliverableId: string | null;

  // Brief review state
  briefReviewData: BriefReviewData | null;
  additionalInstructions: string;

  // Master message
  masterMessage: MasterMessage | null;

  // Loading states
  isInitializing: boolean;
  isGenerating: boolean;
  isGeneratingAll: boolean;
  isSimulatingPersonas: boolean;

  // Error
  error: string | null;
}

interface ComponentPipelineActions {
  // Initialization
  initializePipeline: (
    deliverableId: string,
    components: DeliverableComponentState[],
    pipelineStatus: PipelineStatusType,
  ) => void;
  setBriefReviewData: (data: BriefReviewData) => void;
  setAdditionalInstructions: (instructions: string) => void;
  setMasterMessage: (message: MasterMessage | null) => void;

  // Component selection
  setActiveComponent: (id: string | null) => void;

  // Status updates
  setPipelineStatus: (status: PipelineStatusType) => void;
  updateComponentStatus: (id: string, status: ComponentStatusType) => void;
  updateComponentContent: (id: string, updates: Partial<DeliverableComponentState>) => void;

  // Ratings & feedback
  setComponentRating: (id: string, rating: number, feedback?: string) => void;

  // Image source
  setImageSource: (id: string, source: ImageSourceType) => void;

  // AI model
  setComponentModel: (id: string, modelId: string) => void;

  // Approve / revise
  approveComponent: (id: string) => void;
  requestRevision: (id: string, feedback: string) => void;

  // Generation state
  setIsGenerating: (generating: boolean) => void;
  setIsGeneratingAll: (generating: boolean) => void;
  setIsInitializing: (initializing: boolean) => void;
  setIsSimulatingPersonas: (simulating: boolean) => void;

  // Persona reactions
  setPersonaReactions: (componentId: string, reactions: DeliverableComponentState['personaReactions']) => void;

  // Sequence/variant management
  addSequenceItem: (afterIndex: number) => void;
  removeSequenceItem: (index: number) => void;
  reorderComponents: (fromIndex: number, toIndex: number) => void;

  // Error
  setError: (error: string | null) => void;

  // Reset
  reset: () => void;
}

const INITIAL_STATE: ComponentPipelineState = {
  pipelineStatus: 'LEGACY',
  components: [],
  activeComponentId: null,
  deliverableId: null,
  briefReviewData: null,
  additionalInstructions: '',
  masterMessage: null,
  isInitializing: false,
  isGenerating: false,
  isGeneratingAll: false,
  isSimulatingPersonas: false,
  error: null,
};

export const useComponentPipelineStore = create<ComponentPipelineState & ComponentPipelineActions>(
  (set, get) => ({
    ...INITIAL_STATE,

    // ─── Initialization ───────────────────────────────────────
    initializePipeline: (deliverableId, components, pipelineStatus) => {
      set({
        deliverableId,
        components,
        pipelineStatus,
        activeComponentId: components[0]?.id ?? null,
        error: null,
      });
    },

    setBriefReviewData: (data) => set({ briefReviewData: data }),
    setAdditionalInstructions: (instructions) => set({ additionalInstructions: instructions }),
    setMasterMessage: (message) => set({ masterMessage: message }),

    // ─── Component Selection ──────────────────────────────────
    setActiveComponent: (id) => set({ activeComponentId: id }),

    // ─── Status Updates ───────────────────────────────────────
    setPipelineStatus: (status) => set({ pipelineStatus: status }),

    updateComponentStatus: (id, status) => {
      set((state) => ({
        components: state.components.map((c) =>
          c.id === id ? { ...c, status } : c,
        ),
      }));
    },

    updateComponentContent: (id, updates) => {
      set((state) => ({
        components: state.components.map((c) =>
          c.id === id ? { ...c, ...updates } : c,
        ),
      }));
    },

    // ─── Ratings & Feedback ───────────────────────────────────
    setComponentRating: (id, rating, feedback) => {
      set((state) => ({
        components: state.components.map((c) =>
          c.id === id
            ? { ...c, rating, feedbackText: feedback ?? c.feedbackText }
            : c,
        ),
      }));
    },

    // ─── Image Source ─────────────────────────────────────────
    setImageSource: (id, source) => {
      set((state) => ({
        components: state.components.map((c) =>
          c.id === id ? { ...c, imageSource: source } : c,
        ),
      }));
    },

    // ─── AI Model ─────────────────────────────────────────────
    setComponentModel: (id, modelId) => {
      set((state) => ({
        components: state.components.map((c) =>
          c.id === id ? { ...c, aiModel: modelId } : c,
        ),
      }));
    },

    // ─── Approve / Revise ─────────────────────────────────────
    approveComponent: (id) => {
      set((state) => ({
        components: state.components.map((c) =>
          c.id === id
            ? { ...c, status: 'APPROVED' as ComponentStatusType, approvedAt: new Date().toISOString() }
            : c,
        ),
      }));
    },

    requestRevision: (id, feedback) => {
      set((state) => ({
        components: state.components.map((c) =>
          c.id === id
            ? { ...c, status: 'NEEDS_REVISION' as ComponentStatusType, feedbackText: feedback }
            : c,
        ),
      }));
    },

    // ─── Generation State ─────────────────────────────────────
    setIsGenerating: (generating) => set({ isGenerating: generating }),
    setIsGeneratingAll: (generating) => set({ isGeneratingAll: generating }),
    setIsInitializing: (initializing) => set({ isInitializing: initializing }),
    setIsSimulatingPersonas: (simulating) => set({ isSimulatingPersonas: simulating }),

    // ─── Persona Reactions ────────────────────────────────────
    setPersonaReactions: (componentId, reactions) => {
      set((state) => ({
        components: state.components.map((c) =>
          c.id === componentId ? { ...c, personaReactions: reactions } : c,
        ),
      }));
    },

    // ─── Sequence/Variant Management ──────────────────────────
    addSequenceItem: (afterIndex) => {
      const { components } = get();
      const newOrder = afterIndex + 1;
      const newComponent: DeliverableComponentState = {
        id: `temp-${Date.now()}`,
        deliverableId: get().deliverableId ?? '',
        componentType: 'body_text',
        groupType: 'sequence_item',
        groupIndex: newOrder,
        order: newOrder,
        status: 'PENDING',
        generatedContent: null,
        imageUrl: null,
        imageSource: null,
        videoUrl: null,
        visualBrief: null,
        aiModel: null,
        promptUsed: null,
        cascadingContext: null,
        rating: null,
        feedbackText: null,
        personaReactions: null,
        generatedAt: null,
        approvedAt: null,
        version: 1,
        label: `Item ${newOrder + 1}`,
      };

      const updated = [...components];
      updated.splice(afterIndex + 1, 0, newComponent);
      // Re-index orders
      updated.forEach((c, i) => { c.order = i; });
      set({ components: updated });
    },

    removeSequenceItem: (index) => {
      set((state) => {
        const updated = state.components.filter((_, i) => i !== index);
        updated.forEach((c, i) => { c.order = i; });
        return { components: updated };
      });
    },

    reorderComponents: (fromIndex, toIndex) => {
      set((state) => {
        const updated = [...state.components];
        const [moved] = updated.splice(fromIndex, 1);
        updated.splice(toIndex, 0, moved);
        updated.forEach((c, i) => { c.order = i; });
        return { components: updated };
      });
    },

    // ─── Error ────────────────────────────────────────────────
    setError: (error) => set({ error }),

    // ─── Reset ────────────────────────────────────────────────
    reset: () => set(INITIAL_STATE),
  }),
);

// ─── Computed Selectors ─────────────────────────────────────

export function getProgress(state: ComponentPipelineState): PipelineProgress {
  const total = state.components.filter((c) => c.status !== 'SKIPPED').length;
  const approved = state.components.filter((c) => c.status === 'APPROVED').length;
  return {
    approved,
    total,
    percentage: total > 0 ? Math.round((approved / total) * 100) : 0,
  };
}

export function getNextPendingComponent(
  state: ComponentPipelineState,
): DeliverableComponentState | null {
  return (
    state.components.find(
      (c) => c.status === 'PENDING' || c.status === 'NEEDS_REVISION',
    ) ?? null
  );
}

export function canGenerate(
  state: ComponentPipelineState,
  componentId: string,
): boolean {
  const component = state.components.find((c) => c.id === componentId);
  if (!component) return false;
  if (component.status === 'GENERATING') return false;
  if (component.status === 'APPROVED') return false;

  // Check dependencies — currently a simple check by component registry
  // In a full implementation, this would check dependsOn specs
  return true;
}

export function getApprovedSiblings(
  state: ComponentPipelineState,
  componentId: string,
): DeliverableComponentState[] {
  return state.components.filter(
    (c) => c.status === 'APPROVED' && c.id !== componentId,
  );
}
