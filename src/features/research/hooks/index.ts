import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/research.api";
import { useResearchStore } from "../stores/useResearchStore";
import type { CreatePlanBody } from "../types/research.types";

// ─── Query Keys ─────────────────────────────────────────────

export const researchKeys = {
  all: ["research"] as const,
  stats: () => [...researchKeys.all, "stats"] as const,
  methodStatus: () => [...researchKeys.all, "method-status"] as const,
  active: () => [...researchKeys.all, "active"] as const,
  pending: () => [...researchKeys.all, "pending"] as const,
  insights: () => [...researchKeys.all, "insights"] as const,
  recommended: () => [...researchKeys.all, "recommended"] as const,
  bundles: (params?: Record<string, unknown>) => [...researchKeys.all, "bundles", params] as const,
  bundleDetail: (id: string) => [...researchKeys.all, "bundles", id] as const,
  availableAssets: () => [...researchKeys.all, "custom", "assets"] as const,
  methods: () => [...researchKeys.all, "custom", "methods"] as const,
  plan: (id: string) => [...researchKeys.all, "custom", "plan", id] as const,
  studies: (status?: string) => [...researchKeys.all, "studies", status] as const,
};

// ─── 1. useResearchStats ────────────────────────────────────

export function useResearchStats() {
  return useQuery({
    queryKey: researchKeys.stats(),
    queryFn: api.fetchResearchStats,
  });
}

// ─── 2. useMethodStatus ─────────────────────────────────────

export function useMethodStatus() {
  return useQuery({
    queryKey: researchKeys.methodStatus(),
    queryFn: api.fetchMethodStatus,
  });
}

// ─── 3. useActiveResearch ───────────────────────────────────

export function useActiveResearch() {
  return useQuery({
    queryKey: researchKeys.active(),
    queryFn: api.fetchActiveResearch,
    select: (d) => d.items,
  });
}

// ─── 4. usePendingValidation ────────────────────────────────

export function usePendingValidation() {
  return useQuery({
    queryKey: researchKeys.pending(),
    queryFn: api.fetchPendingValidation,
    select: (d) => d.items,
  });
}

// ─── 5. useQuickInsights ────────────────────────────────────

export function useQuickInsights() {
  return useQuery({
    queryKey: researchKeys.insights(),
    queryFn: api.fetchInsights,
    select: (d) => d.insights,
  });
}

// ─── 6. useRecommendedActions ───────────────────────────────

export function useRecommendedActions() {
  return useQuery({
    queryKey: researchKeys.recommended(),
    queryFn: api.fetchRecommendedActions,
    select: (d) => d.actions,
  });
}

// ─── 7. useBundles ──────────────────────────────────────────

export function useBundles() {
  return useQuery({
    queryKey: researchKeys.bundles(),
    queryFn: api.fetchBundles,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

// ─── 8. useBundleDetail ─────────────────────────────────────

export function useBundleDetail(id: string | null) {
  return useQuery({
    queryKey: researchKeys.bundleDetail(id ?? ""),
    queryFn: () => api.fetchBundleDetail(id!),
    enabled: !!id,
  });
}

// ─── 9. useSelectBundle ─────────────────────────────────────

export function useSelectBundle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.selectBundle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: researchKeys.bundles() });
      queryClient.invalidateQueries({ queryKey: researchKeys.stats() });
    },
  });
}

// ─── 10. useAvailableAssets ─────────────────────────────────

export function useAvailableAssets() {
  return useQuery({
    queryKey: researchKeys.availableAssets(),
    queryFn: api.fetchAvailableAssets,
    select: (d) => d.assets,
  });
}

// ─── 11. useValidationMethods ───────────────────────────────

export function useValidationMethods() {
  return useQuery({
    queryKey: researchKeys.methods(),
    queryFn: api.fetchMethods,
    select: (d) => d.methods,
  });
}

// ─── 12. useCreatePlan ──────────────────────────────────────

export function useCreatePlan() {
  const queryClient = useQueryClient();
  const setCurrentPlanId = useResearchStore((s) => s.setCurrentPlanId);
  return useMutation({
    mutationFn: api.createPlan,
    onSuccess: (data) => {
      setCurrentPlanId(data.plan.id);
      queryClient.invalidateQueries({ queryKey: researchKeys.stats() });
    },
  });
}

// ─── 13. useUpdatePlan ──────────────────────────────────────

export function useUpdatePlan(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<CreatePlanBody>) => api.updatePlan(planId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: researchKeys.plan(planId) });
    },
  });
}

// ─── 14. usePurchasePlan ────────────────────────────────────

export function usePurchasePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => api.purchasePlan(planId),
    onSuccess: (_data, planId) => {
      queryClient.invalidateQueries({ queryKey: researchKeys.plan(planId) });
      queryClient.invalidateQueries({ queryKey: researchKeys.stats() });
    },
  });
}

// ─── 15. useStartValidation ─────────────────────────────────

export function useStartValidation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => api.startValidation(planId),
    onSuccess: (_data, planId) => {
      queryClient.invalidateQueries({ queryKey: researchKeys.plan(planId) });
      queryClient.invalidateQueries({ queryKey: researchKeys.stats() });
      queryClient.invalidateQueries({ queryKey: researchKeys.active() });
    },
  });
}
