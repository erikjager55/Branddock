import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchInsights,
  createInsight,
  fetchInsightDetail,
  updateInsight,
  deleteInsight,
  fetchInsightStats,
  startAiResearch,
  addSource,
  deleteSource,
  fetchProviders,
} from "../api/insights.api";
import type {
  InsightListParams,
  InsightListResponse,
  InsightDetail,
  InsightStats,
  InsightWithMeta,
  CreateInsightBody,
  UpdateInsightBody,
  AddInsightSourceBody,
  AiResearchBody,
  AiResearchJobResponse,
  ImportProvider,
} from "../types/market-insight.types";
import type { InsightSourceUrl } from "@/types/market-insight";

// ─── Query key factory ──────────────────────────────────────

export const insightKeys = {
  all: ["insights"] as const,
  list: (filters?: InsightListParams) =>
    [...insightKeys.all, "list", filters ?? {}] as const,
  detail: (id: string) => [...insightKeys.all, "detail", id] as const,
  stats: () => [...insightKeys.all, "stats"] as const,
  providers: () => [...insightKeys.all, "providers"] as const,
};

// ─── 1. useInsights ─────────────────────────────────────────

export function useInsights(params?: InsightListParams) {
  return useQuery<InsightListResponse>({
    queryKey: insightKeys.list(params),
    queryFn: () => fetchInsights(params),
    staleTime: 30_000,
  });
}

// ─── 2. useInsightDetail ────────────────────────────────────

export function useInsightDetail(id: string | undefined) {
  return useQuery<InsightDetail>({
    queryKey: insightKeys.detail(id ?? ""),
    queryFn: () => fetchInsightDetail(id!),
    enabled: !!id,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

// ─── 3. useCreateInsight ────────────────────────────────────

export function useCreateInsight() {
  const queryClient = useQueryClient();
  return useMutation<InsightWithMeta, Error, CreateInsightBody>({
    mutationFn: (body) => createInsight(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightKeys.all });
    },
  });
}

// ─── 4. useUpdateInsight ────────────────────────────────────

export function useUpdateInsight(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<InsightWithMeta, Error, UpdateInsightBody>({
    mutationFn: (body) => updateInsight(id!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightKeys.detail(id!) });
      queryClient.invalidateQueries({ queryKey: insightKeys.list() });
    },
  });
}

// ─── 5. useDeleteInsight ────────────────────────────────────

export function useDeleteInsight(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, void>({
    mutationFn: () => deleteInsight(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightKeys.list() });
      queryClient.invalidateQueries({ queryKey: insightKeys.stats() });
    },
  });
}

// ─── 6. useInsightStats ─────────────────────────────────────

export function useInsightStats() {
  return useQuery<InsightStats>({
    queryKey: insightKeys.stats(),
    queryFn: fetchInsightStats,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

// ─── 7. useStartAiResearch ──────────────────────────────────

export function useStartAiResearch() {
  const queryClient = useQueryClient();
  return useMutation<AiResearchJobResponse, Error, AiResearchBody>({
    mutationFn: (body) => startAiResearch(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightKeys.list() });
      queryClient.invalidateQueries({ queryKey: insightKeys.stats() });
    },
  });
}

// ─── 8. useAddSource ────────────────────────────────────────

export function useAddSource(insightId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<InsightSourceUrl, Error, AddInsightSourceBody>({
    mutationFn: (body) => addSource(insightId!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightKeys.detail(insightId!) });
    },
  });
}

// ─── 9. useDeleteSource ─────────────────────────────────────

export function useDeleteSource(insightId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (sourceId) => deleteSource(insightId!, sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightKeys.detail(insightId!) });
    },
  });
}

// ─── 10. useProviders ───────────────────────────────────────

export function useProviders() {
  return useQuery<{ providers: ImportProvider[] }>({
    queryKey: insightKeys.providers(),
    queryFn: fetchProviders,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  });
}
