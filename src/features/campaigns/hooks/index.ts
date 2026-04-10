// =============================================================
// Campaigns TanStack Query hooks — 15+ hooks
// =============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import type { CampaignListParams, DeliverableResponse } from '@/types/campaign';
import type { CampaignBlueprint, RegenerateBlueprintBody } from '@/lib/campaigns/strategy-blueprint.types';
import {
  fetchCampaigns,
  fetchCampaignStats,
  fetchCampaignDetail,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  archiveCampaign,
  createQuickContent,
  fetchPromptSuggestions,
  convertToCampaign,
  fetchKnowledgeAssets,
  addKnowledgeAsset,
  removeKnowledgeAsset,
  fetchCoverage,
  fetchDeliverables,
  addDeliverable,
  updateDeliverable,
  deleteDeliverable,
  fetchStrategy,
  regenerateBlueprintLayer,
  fetchDrafts,
  fetchDraftDetail,
  archiveDraft,
} from '../api/campaigns.api';

// ─── Query Keys ────────────────────────────────────────────

export const campaignKeys = {
  all: ['campaigns'] as const,
  list: (params?: CampaignListParams) => ['campaigns', 'list', params] as const,
  stats: () => ['campaigns', 'stats'] as const,
  detail: (id: string) => ['campaigns', id] as const,
  knowledge: (id: string) => ['campaigns', id, 'knowledge'] as const,
  coverage: (id: string) => ['campaigns', id, 'coverage'] as const,
  deliverables: (id: string) => ['campaigns', id, 'deliverables'] as const,
  strategy: (id: string) => ['campaigns', id, 'strategy'] as const,
  promptSuggestions: () => ['campaigns', 'quick', 'prompts'] as const,
  drafts: (type?: 'STRATEGIC' | 'CONTENT') =>
    type ? (['campaigns', 'drafts', type] as const) : (['campaigns', 'drafts'] as const),
};

// ─── List + Stats ──────────────────────────────────────────

export function useCampaigns(params?: CampaignListParams) {
  return useQuery({
    queryKey: campaignKeys.list(params),
    queryFn: () => fetchCampaigns(params),
  });
}

export function useCampaignStats() {
  return useQuery({
    queryKey: campaignKeys.stats(),
    queryFn: fetchCampaignStats,
  });
}

// ─── Detail ────────────────────────────────────────────────

export function useCampaignDetail(id: string) {
  return useQuery({
    queryKey: campaignKeys.detail(id),
    queryFn: () => fetchCampaignDetail(id),
    enabled: !!id,
  });
}

// ─── Mutations ─────────────────────────────────────────────

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

export function useUpdateCampaign(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof updateCampaign>[1]) => updateCampaign(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.detail(id) });
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

export function useArchiveCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: archiveCampaign,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: campaignKeys.detail(id) });
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

// ─── Drafts (Fase 2 — DB-backed wizard drafts) ─────────────

/**
 * List the current user's drafts in the active workspace. Pass a `type` to
 * restrict to just one kind — the Campaigns page passes 'STRATEGIC', the
 * Content Library passes 'CONTENT'.
 */
export function useDraftCampaigns(type?: 'STRATEGIC' | 'CONTENT') {
  return useQuery({
    queryKey: campaignKeys.drafts(type),
    queryFn: () => fetchDrafts(type),
  });
}

/** Soft-delete a draft. Invalidates all drafts queries on success. */
export function useArchiveDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveDraft(id),
    onSuccess: () => {
      // Invalidate the base drafts key so all type-filtered variants refetch.
      qc.invalidateQueries({ queryKey: ['campaigns', 'drafts'] });
      // Archived drafts stay out of /api/campaigns (filtered by status+isArchived),
      // but the archived view reads from the same key so invalidate that too.
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

/**
 * Loads a single draft's full state for the Resume flow. Used imperatively
 * (not via hook state) because we need to wait for the detail before
 * calling loadDraft() + navigate.
 */
export async function loadDraftForResume(id: string) {
  return fetchDraftDetail(id);
}

// ─── Quick Content ─────────────────────────────────────────

export function useCreateQuickContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createQuickContent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

export function usePromptSuggestions() {
  return useQuery({
    queryKey: campaignKeys.promptSuggestions(),
    queryFn: fetchPromptSuggestions,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60_000,
  });
}

export function useConvertToCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof convertToCampaign>[1] }) =>
      convertToCampaign(id, body),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: campaignKeys.detail(id) });
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

// ─── Knowledge Assets ──────────────────────────────────────

export function useKnowledgeAssets(campaignId: string) {
  return useQuery({
    queryKey: campaignKeys.knowledge(campaignId),
    queryFn: () => fetchKnowledgeAssets(campaignId),
    enabled: !!campaignId,
  });
}

export function useAddKnowledgeAsset(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof addKnowledgeAsset>[1]) => addKnowledgeAsset(campaignId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.knowledge(campaignId) });
      qc.invalidateQueries({ queryKey: campaignKeys.coverage(campaignId) });
    },
  });
}

export function useRemoveKnowledgeAsset(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => removeKnowledgeAsset(campaignId, assetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.knowledge(campaignId) });
      qc.invalidateQueries({ queryKey: campaignKeys.coverage(campaignId) });
    },
  });
}

export function useCoverage(campaignId: string) {
  return useQuery({
    queryKey: campaignKeys.coverage(campaignId),
    queryFn: () => fetchCoverage(campaignId),
    enabled: !!campaignId,
  });
}

// ─── Deliverables ──────────────────────────────────────────

export function useDeliverables(campaignId: string) {
  return useQuery({
    queryKey: campaignKeys.deliverables(campaignId),
    queryFn: () => fetchDeliverables(campaignId),
    enabled: !!campaignId,
  });
}

export function useAddDeliverable(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof addDeliverable>[1]) => addDeliverable(campaignId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.deliverables(campaignId) });
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

export function useUpdateDeliverable(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deliverableId, body }: { deliverableId: string; body: Parameters<typeof updateDeliverable>[2] }) =>
      updateDeliverable(campaignId, deliverableId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.deliverables(campaignId) });
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

export function useDeleteDeliverable(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deliverableId: string) => deleteDeliverable(campaignId, deliverableId),
    onMutate: async (deliverableId: string) => {
      await qc.cancelQueries({ queryKey: campaignKeys.deliverables(campaignId) });
      const previous = qc.getQueryData<DeliverableResponse[]>(campaignKeys.deliverables(campaignId));
      qc.setQueryData<DeliverableResponse[]>(
        campaignKeys.deliverables(campaignId),
        (old) => old ? old.filter((d) => d.id !== deliverableId) : [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(campaignKeys.deliverables(campaignId), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.deliverables(campaignId) });
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

// ─── Strategy ──────────────────────────────────────────────

export function useStrategy(campaignId: string) {
  return useQuery({
    queryKey: campaignKeys.strategy(campaignId),
    queryFn: () => fetchStrategy(campaignId),
    enabled: !!campaignId,
  });
}

// =============================================================
// Content Library hooks
// =============================================================

import type {
  ContentLibraryItem,
  ContentLibraryStatsResponse,
  ContentLibraryParams,
} from '../types/content-library.types';
import type {
  WizardKnowledgeResponse,
  DeliverableTypeOption,
  LaunchCampaignBody,
  LaunchCampaignResponse,
  EstimateTimelineResponse,
} from '../types/campaign-wizard.types';

// ─── Content Library Query Keys ───────────────────────────

export const contentLibraryKeys = {
  all: ['content-library'] as const,
  list: (params?: ContentLibraryParams) =>
    [...contentLibraryKeys.all, 'list', params] as const,
  stats: () => [...contentLibraryKeys.all, 'stats'] as const,
};

export const campaignWizardKeys = {
  all: ['campaign-wizard'] as const,
  knowledge: () => [...campaignWizardKeys.all, 'knowledge'] as const,
  strategy: () => [...campaignWizardKeys.all, 'strategy'] as const,
  deliverableTypes: () =>
    [...campaignWizardKeys.all, 'deliverable-types'] as const,
  timeline: () => [...campaignWizardKeys.all, 'timeline'] as const,
};

// ─── Content Library Fetch Functions ──────────────────────

async function fetchContentLibrary(
  params?: ContentLibraryParams,
): Promise<ContentLibraryItem[]> {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set('type', params.type);
  if (params?.campaignType) searchParams.set('campaignType', params.campaignType);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.sort) searchParams.set('sort', params.sort);
  if (params?.favorites) searchParams.set('favorites', 'true');
  if (params?.groupByCampaign) searchParams.set('groupByCampaign', 'true');
  if (params?.search) searchParams.set('search', params.search);

  const qs = searchParams.toString();
  const res = await fetch(`/api/content-library${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch content library');
  const data = await res.json();
  return data.items ?? data;
}

async function fetchContentLibraryStats(): Promise<ContentLibraryStatsResponse> {
  const res = await fetch('/api/content-library/stats');
  if (!res.ok) throw new Error('Failed to fetch content stats');
  return res.json();
}

async function toggleContentFavorite(
  id: string,
): Promise<{ isFavorite: boolean }> {
  const res = await fetch(`/api/content-library/${id}/favorite`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error('Failed to toggle favorite');
  return res.json();
}

// ─── Wizard Fetch Functions ───────────────────────────────

async function fetchWizardKnowledge(): Promise<WizardKnowledgeResponse> {
  const res = await fetch('/api/campaigns/wizard/knowledge');
  if (!res.ok) throw new Error('Failed to fetch knowledge');
  return res.json();
}

async function fetchDeliverableTypes(): Promise<DeliverableTypeOption[]> {
  const res = await fetch('/api/campaigns/wizard/deliverable-types');
  if (!res.ok) throw new Error('Failed to fetch deliverable types');
  return res.json();
}

async function launchCampaign(
  body: LaunchCampaignBody,
): Promise<LaunchCampaignResponse> {
  const res = await fetch('/api/campaigns/wizard/launch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to launch campaign');
  return res.json();
}

async function fetchEstimateTimeline(): Promise<EstimateTimelineResponse> {
  const res = await fetch('/api/campaigns/wizard/estimate-timeline');
  if (!res.ok) throw new Error('Failed to estimate timeline');
  return res.json();
}

// ─── Content Library Hooks ────────────────────────────────

export function useContentLibrary(params?: ContentLibraryParams) {
  return useQuery({
    queryKey: contentLibraryKeys.list(params),
    queryFn: () => fetchContentLibrary(params),
  });
}

export function useContentLibraryStats() {
  return useQuery({
    queryKey: contentLibraryKeys.stats(),
    queryFn: fetchContentLibraryStats,
  });
}

export function useToggleContentFavorite(): UseMutationResult<
  { isFavorite: boolean },
  Error,
  string
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: toggleContentFavorite,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contentLibraryKeys.all });
    },
  });
}

// ─── Campaign Wizard Hooks ────────────────────────────────

export function useWizardKnowledge() {
  return useQuery({
    queryKey: campaignWizardKeys.knowledge(),
    queryFn: fetchWizardKnowledge,
  });
}

// ─── Blueprint Hooks ──────────────────────────────────────

/** Regenerate a specific layer of an existing campaign blueprint */
export function useRegenerateBlueprintLayer(campaignId: string): UseMutationResult<
  CampaignBlueprint,
  Error,
  RegenerateBlueprintBody
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RegenerateBlueprintBody) => regenerateBlueprintLayer(campaignId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.strategy(campaignId) });
      qc.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

export function useDeliverableTypes() {
  return useQuery({
    queryKey: campaignWizardKeys.deliverableTypes(),
    queryFn: fetchDeliverableTypes,
  });
}

export function useLaunchCampaign(): UseMutationResult<
  LaunchCampaignResponse,
  Error,
  LaunchCampaignBody
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: launchCampaign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contentLibraryKeys.all });
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

export function useEstimateTimeline() {
  return useQuery({
    queryKey: campaignWizardKeys.timeline(),
    queryFn: fetchEstimateTimeline,
  });
}
