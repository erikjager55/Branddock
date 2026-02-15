import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchResearchPlans,
  createResearchPlan,
  updateResearchPlan,
  fetchPurchasedBundles,
  purchaseBundle,
} from "@/lib/api/research-plans";
import type {
  ResearchPlanListResponse,
  CreateResearchPlanBody,
  UpdateResearchPlanBody,
  PurchasedBundleListResponse,
  PurchaseBundleBody,
} from "@/types/research-plan";

// --- Research Plans ---

export const researchPlanKeys = {
  all: ["research-plans"] as const,
  list: (workspaceId: string, status?: string) =>
    ["research-plans", "list", workspaceId, status ?? "all"] as const,
};

export function useResearchPlans(workspaceId: string | undefined, status?: string) {
  return useQuery<ResearchPlanListResponse>({
    queryKey: researchPlanKeys.list(workspaceId ?? "", status),
    queryFn: () => fetchResearchPlans(workspaceId!, status),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

export function useCreateResearchPlan(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateResearchPlanBody) => createResearchPlan(workspaceId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: researchPlanKeys.all }),
  });
}

export function useUpdateResearchPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateResearchPlanBody }) =>
      updateResearchPlan(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: researchPlanKeys.all }),
  });
}

// --- Purchased Bundles ---

export const purchasedBundleKeys = {
  all: ["purchased-bundles"] as const,
  list: (workspaceId: string) =>
    ["purchased-bundles", "list", workspaceId] as const,
};

export function usePurchasedBundles(workspaceId: string | undefined) {
  return useQuery<PurchasedBundleListResponse>({
    queryKey: purchasedBundleKeys.list(workspaceId ?? ""),
    queryFn: () => fetchPurchasedBundles(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

export function usePurchaseBundle(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PurchaseBundleBody) => purchaseBundle(workspaceId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: purchasedBundleKeys.all }),
  });
}
