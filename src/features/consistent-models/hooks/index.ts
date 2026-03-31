// =============================================================
// Consistent Model TanStack Query Hooks
// =============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/consistent-models.api";
import type {
  ConsistentModelListParams,
  CreateModelBody,
  UpdateModelBody,
  GenerateImageBody,
  StartTrainingBody,
  GenerationsListParams,
} from "../types/consistent-model.types";

// ─── Query Keys ─────────────────────────────────────────────

export const consistentModelKeys = {
  all: ["consistent-models"] as const,
  list: () => [...consistentModelKeys.all, "list"] as const,
  detail: (id: string) => [...consistentModelKeys.all, "detail", id] as const,
  generations: (id: string) => [...consistentModelKeys.all, "generations", id] as const,
  trainingStatus: (id: string) => [...consistentModelKeys.all, "training-status", id] as const,
  stats: () => [...consistentModelKeys.all, "stats"] as const,
};

// ─── 1. useConsistentModels ─────────────────────────────────

export function useConsistentModels(params?: ConsistentModelListParams) {
  return useQuery({
    queryKey: [...consistentModelKeys.list(), params] as const,
    queryFn: () => api.fetchConsistentModels(params),
    staleTime: 30_000,
  });
}

// ─── 2. useConsistentModelDetail ────────────────────────────

export function useConsistentModelDetail(id: string | null | undefined) {
  return useQuery({
    queryKey: consistentModelKeys.detail(id ?? ""),
    queryFn: () => api.fetchConsistentModelDetail(id!),
    enabled: !!id,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

// ─── 3. useCreateModel ──────────────────────────────────────

export function useCreateModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateModelBody) => api.createConsistentModel(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: consistentModelKeys.list() });
    },
  });
}

// ─── 4. useUpdateModel ──────────────────────────────────────

export function useUpdateModel(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateModelBody) => api.updateConsistentModel(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: consistentModelKeys.detail(id!) });
      qc.invalidateQueries({ queryKey: consistentModelKeys.list() });
    },
  });
}

// ─── 5. useDeleteModel ──────────────────────────────────────

export function useDeleteModel(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteConsistentModel(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: consistentModelKeys.list() });
    },
  });
}

// ─── 6. useUploadReferenceImages ────────────────────────────

export function useUploadReferenceImages(modelId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => api.uploadReferenceImages(modelId!, files),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: consistentModelKeys.detail(modelId!) });
      qc.invalidateQueries({ queryKey: consistentModelKeys.list() });
    },
  });
}

// ─── 7. useDeleteReferenceImage ─────────────────────────────

export function useDeleteReferenceImage(modelId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => api.deleteReferenceImage(modelId!, imageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: consistentModelKeys.detail(modelId!) });
    },
  });
}

// ─── 8. useReorderReferenceImages ───────────────────────────

export function useReorderReferenceImages(modelId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imageIds: string[]) => api.reorderReferenceImages(modelId!, imageIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: consistentModelKeys.detail(modelId!) });
    },
  });
}

// ─── 9. useStartTraining ────────────────────────────────────

export function useStartTraining(modelId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config?: StartTrainingBody) => api.startTraining(modelId!, config),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: consistentModelKeys.detail(modelId!) });
      qc.invalidateQueries({ queryKey: consistentModelKeys.list() });
    },
  });
}

// ─── 10. useTrainingStatus (polling) ────────────────────────

export function useTrainingStatus(
  modelId: string | null | undefined,
  isTraining: boolean,
) {
  return useQuery({
    queryKey: consistentModelKeys.trainingStatus(modelId ?? ""),
    queryFn: () => api.fetchTrainingStatus(modelId!),
    enabled: !!modelId && isTraining,
    refetchInterval: isTraining ? 10_000 : false,
    staleTime: 5_000,
  });
}

// ─── 11. useGenerateImage ───────────────────────────────────

export function useGenerateImage(modelId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GenerateImageBody) => api.generateImage(modelId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: consistentModelKeys.generations(modelId!) });
      qc.invalidateQueries({ queryKey: consistentModelKeys.detail(modelId!) });
      qc.invalidateQueries({ queryKey: consistentModelKeys.list() });
    },
  });
}

// ─── 12. useGenerations ─────────────────────────────────────

export function useGenerations(
  modelId: string | null | undefined,
  params?: GenerationsListParams,
) {
  return useQuery({
    queryKey: [...consistentModelKeys.generations(modelId ?? ""), params] as const,
    queryFn: () => api.fetchGenerations(modelId!, params),
    enabled: !!modelId,
    staleTime: 30_000,
  });
}

// ─── 13. useRefreshBrandContext ─────────────────────────────

export function useRefreshBrandContext(modelId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.refreshBrandContext(modelId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: consistentModelKeys.detail(modelId!) });
      qc.invalidateQueries({ queryKey: consistentModelKeys.list() });
    },
  });
}

// ─── 14. useConsistentModelStats ────────────────────────────

export function useConsistentModelStats() {
  return useQuery({
    queryKey: consistentModelKeys.stats(),
    queryFn: async () => {
      const data = await api.fetchConsistentModels();
      return data.stats;
    },
    staleTime: 30_000,
  });
}

// ─── 14. useDefaultModel ────────────────────────────────────

export function useDefaultModel(type: string | undefined) {
  const { data } = useConsistentModels(
    type ? { type: type as "PERSON" | "PRODUCT" | "STYLE" | "OBJECT", status: "READY" } : undefined,
  );
  return data?.models.find((m) => m.isDefault) ?? data?.models[0] ?? null;
}
