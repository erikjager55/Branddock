// =============================================================
// Content Studio Zustand Store — S6.C (Prompt 4 + 5 state)
// =============================================================

import { create } from 'zustand';
import type {
  ContentTab,
  TypeSettings,
  CarouselSlide,
  ChecklistItem,
  InsertFormatType,
  InsertLocationType,
  DeliverableBriefSettings,
} from '@/types/studio';
import type { ValidationResult } from '@/lib/studio/content-validator';
import type { CampaignBlueprint, AssetPlanLayer } from '@/lib/campaigns/strategy-blueprint.types';

/** Context passed from campaign detail to Content Studio */
export interface CampaignStudioContext {
  campaignId: string;
  campaignName: string;
  campaignGoalType: string | null;
  campaignKnowledgeAssetIds: string[];
  campaignBlueprint: CampaignBlueprint | null;
  deliverableBrief: AssetPlanLayer['deliverables'][0]['brief'] | null;
}

interface ContentStudioState {
  // ─── Tab & Lock ─────────────────────────────────────────
  activeTab: ContentTab;
  isTabLocked: boolean;

  // ─── Prompt & Settings ──────────────────────────────────
  prompt: string;
  aiModel: string;
  settings: TypeSettings | null;

  // ─── Content ────────────────────────────────────────────
  textContent: string;
  imageUrls: string[];
  videoUrl: string | null;
  slides: CarouselSlide[];

  // ─── Generation ─────────────────────────────────────────
  isGenerating: boolean;
  generationProgress: number;
  costEstimate: number | null;

  // ─── Auto-save ──────────────────────────────────────────
  isDirty: boolean;
  lastSavedAt: string | null;

  // ─── Preview ────────────────────────────────────────────
  isPreviewMode: boolean;

  // ─── Quality ────────────────────────────────────────────
  qualityScore: number | null;

  // ─── Improve Panel ──────────────────────────────────────
  isImprovePanelOpen: boolean;

  // ─── Insert Research ────────────────────────────────────
  isInsertModalOpen: boolean;
  selectedInsightId: string | null;
  selectedInsertFormat: InsertFormatType | null;
  selectedInsertLocation: InsertLocationType;

  // ─── Checklist ──────────────────────────────────────────
  checklistItems: ChecklistItem[];

  // ─── Validation ───────────────────────────────────────
  validationResult: ValidationResult | null;

  // ─── Persona Context ──────────────────────────────────
  selectedPersonaIds: string[];

  // ─── Campaign Blueprint Context ───────────────────────
  campaignId: string | null;
  campaignName: string;
  campaignGoalType: string | null;
  campaignKnowledgeAssetIds: string[];
  campaignBlueprint: CampaignBlueprint | null;
  deliverableBrief: AssetPlanLayer['deliverables'][0]['brief'] | null;
}

interface ContentStudioActions {
  // ─── Tab ────────────────────────────────────────────────
  setActiveTab: (tab: ContentTab) => void;
  setIsTabLocked: (locked: boolean) => void;

  // ─── Prompt & Settings ──────────────────────────────────
  setPrompt: (prompt: string) => void;
  setAiModel: (model: string) => void;
  setSettings: (settings: TypeSettings | null) => void;

  // ─── Content ────────────────────────────────────────────
  setTextContent: (text: string) => void;
  setImageUrls: (urls: string[]) => void;
  setVideoUrl: (url: string | null) => void;
  setSlides: (slides: CarouselSlide[]) => void;

  // ─── Generation ─────────────────────────────────────────
  setIsGenerating: (generating: boolean) => void;
  setGenerationProgress: (progress: number) => void;
  setCostEstimate: (cost: number | null) => void;

  // ─── Auto-save ──────────────────────────────────────────
  setIsDirty: (dirty: boolean) => void;
  setLastSavedAt: (at: string | null) => void;

  // ─── Preview ────────────────────────────────────────────
  setIsPreviewMode: (preview: boolean) => void;

  // ─── Quality ────────────────────────────────────────────
  setQualityScore: (score: number | null) => void;

  // ─── Improve Panel ──────────────────────────────────────
  setIsImprovePanelOpen: (open: boolean) => void;

  // ─── Insert Research ────────────────────────────────────
  setIsInsertModalOpen: (open: boolean) => void;
  setSelectedInsightId: (id: string | null) => void;
  setSelectedInsertFormat: (format: InsertFormatType | null) => void;
  setSelectedInsertLocation: (location: InsertLocationType) => void;

  // ─── Checklist ──────────────────────────────────────────
  setChecklistItems: (items: ChecklistItem[]) => void;
  toggleChecklistItem: (index: number) => void;

  // ─── Validation ───────────────────────────────────────
  setValidationResult: (result: ValidationResult | null) => void;

  // ─── Persona Context ──────────────────────────────────
  setSelectedPersonaIds: (ids: string[]) => void;
  togglePersonaId: (id: string) => void;

  // ─── Campaign Blueprint Context ───────────────────────
  setCampaignContext: (ctx: CampaignStudioContext) => void;
  clearCampaignContext: () => void;
  setDeliverableBriefFromSettings: (brief: DeliverableBriefSettings) => void;

  // ─── Reset ──────────────────────────────────────────────
  resetStore: () => void;
}

const initialState: ContentStudioState = {
  activeTab: 'text',
  isTabLocked: false,
  prompt: '',
  aiModel: '',
  settings: null,
  textContent: '',
  imageUrls: [],
  videoUrl: null,
  slides: [],
  isGenerating: false,
  generationProgress: 0,
  costEstimate: null,
  isDirty: false,
  lastSavedAt: null,
  isPreviewMode: false,
  qualityScore: null,
  isImprovePanelOpen: false,
  isInsertModalOpen: false,
  selectedInsightId: null,
  selectedInsertFormat: null,
  selectedInsertLocation: 'cursor',
  checklistItems: [],
  validationResult: null,
  selectedPersonaIds: [],
  campaignId: null,
  campaignName: '',
  campaignGoalType: null,
  campaignKnowledgeAssetIds: [],
  campaignBlueprint: null,
  deliverableBrief: null,
};

export const useContentStudioStore = create<ContentStudioState & ContentStudioActions>((set) => ({
  ...initialState,

  // ─── Tab ────────────────────────────────────────────────
  setActiveTab: (tab) => set({ activeTab: tab }),
  setIsTabLocked: (locked) => set({ isTabLocked: locked }),

  // ─── Prompt & Settings ──────────────────────────────────
  setPrompt: (prompt) => set({ prompt, isDirty: true }),
  setAiModel: (aiModel) => set({ aiModel }),
  setSettings: (settings) => set({ settings, isDirty: true }),

  // ─── Content ────────────────────────────────────────────
  setTextContent: (textContent) => set({ textContent, isDirty: true }),
  setImageUrls: (imageUrls) => set({ imageUrls, isDirty: true }),
  setVideoUrl: (videoUrl) => set({ videoUrl, isDirty: true }),
  setSlides: (slides) => set({ slides, isDirty: true }),

  // ─── Generation ─────────────────────────────────────────
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setGenerationProgress: (generationProgress) => set({ generationProgress }),
  setCostEstimate: (costEstimate) => set({ costEstimate }),

  // ─── Auto-save ──────────────────────────────────────────
  setIsDirty: (isDirty) => set({ isDirty }),
  setLastSavedAt: (lastSavedAt) => set({ lastSavedAt, isDirty: false }),

  // ─── Preview ────────────────────────────────────────────
  setIsPreviewMode: (isPreviewMode) => set({ isPreviewMode }),

  // ─── Quality ────────────────────────────────────────────
  setQualityScore: (qualityScore) => set({ qualityScore }),

  // ─── Improve Panel ──────────────────────────────────────
  setIsImprovePanelOpen: (isImprovePanelOpen) => set({ isImprovePanelOpen }),

  // ─── Insert Research ────────────────────────────────────
  setIsInsertModalOpen: (isInsertModalOpen) =>
    set({
      isInsertModalOpen,
      // Reset selection when closing
      ...(isInsertModalOpen
        ? {}
        : { selectedInsightId: null, selectedInsertFormat: null, selectedInsertLocation: 'cursor' as InsertLocationType }),
    }),
  setSelectedInsightId: (selectedInsightId) => set({ selectedInsightId }),
  setSelectedInsertFormat: (selectedInsertFormat) => set({ selectedInsertFormat }),
  setSelectedInsertLocation: (selectedInsertLocation) => set({ selectedInsertLocation }),

  // ─── Checklist ──────────────────────────────────────────
  setChecklistItems: (checklistItems) => set({ checklistItems }),
  toggleChecklistItem: (index) =>
    set((state) => {
      const items = [...state.checklistItems];
      if (items[index]) {
        items[index] = { ...items[index], checked: !items[index].checked };
      }
      return { checklistItems: items, isDirty: true };
    }),

  // ─── Validation ───────────────────────────────────────
  setValidationResult: (validationResult) => set({ validationResult }),

  // ─── Persona Context ──────────────────────────────────
  setSelectedPersonaIds: (selectedPersonaIds) => set({ selectedPersonaIds }),
  togglePersonaId: (id) =>
    set((state) => ({
      selectedPersonaIds: state.selectedPersonaIds.includes(id)
        ? state.selectedPersonaIds.filter((pid) => pid !== id)
        : [...state.selectedPersonaIds, id],
    })),

  // ─── Campaign Blueprint Context ───────────────────────
  setCampaignContext: (ctx) =>
    set({
      campaignId: ctx.campaignId,
      campaignName: ctx.campaignName,
      campaignGoalType: ctx.campaignGoalType,
      campaignKnowledgeAssetIds: ctx.campaignKnowledgeAssetIds,
      campaignBlueprint: ctx.campaignBlueprint,
      deliverableBrief: ctx.deliverableBrief,
    }),
  clearCampaignContext: () =>
    set({
      campaignId: null,
      campaignName: '',
      campaignGoalType: null,
      campaignKnowledgeAssetIds: [],
      campaignBlueprint: null,
      deliverableBrief: null,
    }),
  setDeliverableBriefFromSettings: (brief) =>
    set({
      deliverableBrief: {
        objective: brief.objective ?? '',
        keyMessage: brief.keyMessage ?? '',
        toneDirection: brief.toneDirection ?? '',
        callToAction: brief.callToAction ?? '',
        contentOutline: brief.contentOutline ?? [],
      },
    }),

  // ─── Reset ──────────────────────────────────────────────
  resetStore: () => set(initialState),
}));
