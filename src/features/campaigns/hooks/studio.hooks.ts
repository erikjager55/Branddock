import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchStudioState,
  updateStudio,
  autoSaveStudio,
  generateContent,
  regenerateContent,
  fetchCostEstimate,
  fetchQualityScore,
  refreshQualityScore,
  fetchImproveSuggestions,
  applySuggestion,
  dismissSuggestion,
  previewSuggestion,
  bulkApplySuggestions,
  fetchResearchInsights,
  insertInsight,
  fetchVersions,
  createVersion,
  restoreVersion,
  exportContent,
} from '../api/studio.api';
import type { UpdateStudioBody, GenerateContentBody, InsertInsightBody, ExportBody } from '@/types/studio';

export const studioKeys = {
  all: ['studio'] as const,
  state: (deliverableId: string) => ['studio', deliverableId] as const,
  costEstimate: (deliverableId: string) => ['studio', deliverableId, 'cost-estimate'] as const,
  quality: (deliverableId: string) => ['studio', deliverableId, 'quality'] as const,
  improve: (deliverableId: string) => ['studio', deliverableId, 'improve'] as const,
  insights: (deliverableId: string) => ['studio', deliverableId, 'insights'] as const,
  versions: (deliverableId: string) => ['studio', deliverableId, 'versions'] as const,
};

export function useStudioState(deliverableId: string) {
  return useQuery({
    queryKey: studioKeys.state(deliverableId),
    queryFn: () => fetchStudioState(deliverableId),
    enabled: !!deliverableId,
  });
}

export function useUpdateStudio(deliverableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateStudioBody) => updateStudio(deliverableId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.state(deliverableId) });
    },
  });
}

export function useAutoSave(deliverableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<UpdateStudioBody>) => autoSaveStudio(deliverableId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.state(deliverableId) });
    },
  });
}

export function useGenerateContent(deliverableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GenerateContentBody) => generateContent(deliverableId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.state(deliverableId) });
      qc.invalidateQueries({ queryKey: studioKeys.costEstimate(deliverableId) });
    },
  });
}

export function useRegenerateContent(deliverableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GenerateContentBody) => regenerateContent(deliverableId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.state(deliverableId) });
    },
  });
}

export function useCostEstimate(deliverableId: string) {
  return useQuery({
    queryKey: studioKeys.costEstimate(deliverableId),
    queryFn: () => fetchCostEstimate(deliverableId),
    enabled: !!deliverableId,
  });
}

// ─── Right Panel Hooks ──────────────────────────────────

export function useQualityScore(deliverableId: string) {
  return useQuery({
    queryKey: studioKeys.quality(deliverableId),
    queryFn: () => fetchQualityScore(deliverableId),
    enabled: !!deliverableId,
  });
}

export function useRefreshQuality(deliverableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => refreshQualityScore(deliverableId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.quality(deliverableId) });
      qc.invalidateQueries({ queryKey: studioKeys.state(deliverableId) });
    },
  });
}

export function useImproveSuggestions(deliverableId: string) {
  return useQuery({
    queryKey: studioKeys.improve(deliverableId),
    queryFn: () => fetchImproveSuggestions(deliverableId),
    enabled: !!deliverableId,
  });
}

export function useApplySuggestion(deliverableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (suggestionId: string) => applySuggestion(deliverableId, suggestionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.improve(deliverableId) });
      qc.invalidateQueries({ queryKey: studioKeys.quality(deliverableId) });
      qc.invalidateQueries({ queryKey: studioKeys.state(deliverableId) });
    },
  });
}

export function useDismissSuggestion(deliverableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (suggestionId: string) => dismissSuggestion(deliverableId, suggestionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.improve(deliverableId) });
    },
  });
}

export function usePreviewSuggestion(deliverableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (suggestionId: string) => previewSuggestion(deliverableId, suggestionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.improve(deliverableId) });
    },
  });
}

export function useBulkApplySuggestions(deliverableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => bulkApplySuggestions(deliverableId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.improve(deliverableId) });
      qc.invalidateQueries({ queryKey: studioKeys.quality(deliverableId) });
      qc.invalidateQueries({ queryKey: studioKeys.state(deliverableId) });
    },
  });
}

export function useResearchInsights(deliverableId: string) {
  return useQuery({
    queryKey: studioKeys.insights(deliverableId),
    queryFn: () => fetchResearchInsights(deliverableId),
    enabled: !!deliverableId,
  });
}

export function useInsertInsight(deliverableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InsertInsightBody) => insertInsight(deliverableId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.state(deliverableId) });
      qc.invalidateQueries({ queryKey: studioKeys.insights(deliverableId) });
    },
  });
}

export function useVersions(deliverableId: string) {
  return useQuery({
    queryKey: studioKeys.versions(deliverableId),
    queryFn: () => fetchVersions(deliverableId),
    enabled: !!deliverableId,
  });
}

export function useCreateVersion(deliverableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => createVersion(deliverableId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.versions(deliverableId) });
    },
  });
}

export function useRestoreVersion(deliverableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => restoreVersion(deliverableId, versionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.state(deliverableId) });
      qc.invalidateQueries({ queryKey: studioKeys.versions(deliverableId) });
      qc.invalidateQueries({ queryKey: studioKeys.quality(deliverableId) });
    },
  });
}

export function useExport(deliverableId: string) {
  return useMutation({
    mutationFn: (body: ExportBody) => exportContent(deliverableId, body),
  });
}
