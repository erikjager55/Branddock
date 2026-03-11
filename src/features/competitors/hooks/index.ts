// =============================================================
// Competitor TanStack Query Hooks
// =============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/competitors.api";
import type {
  CreateCompetitorBody,
  UpdateCompetitorBody,
  CompetitorListParams,
} from "../types/competitor.types";

// ─── Query Keys ─────────────────────────────────────────────

export const competitorKeys = {
  all: ["competitors"] as const,
  list: () => [...competitorKeys.all, "list"] as const,
  detail: (id: string) => [...competitorKeys.all, "detail", id] as const,
  products: (id: string) => [...competitorKeys.all, "products", id] as const,
};

// ─── 1. useCompetitors ──────────────────────────────────────

export function useCompetitors(params?: CompetitorListParams) {
  return useQuery({
    queryKey: [...competitorKeys.list(), params] as const,
    queryFn: () => api.fetchCompetitors(params),
    staleTime: 30_000,
  });
}

// ─── 2. useCompetitorDetail ─────────────────────────────────

export function useCompetitorDetail(id: string | null | undefined) {
  return useQuery({
    queryKey: competitorKeys.detail(id ?? ""),
    queryFn: () => api.fetchCompetitorDetail(id!),
    enabled: !!id,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

// ─── 3. useCreateCompetitor ─────────────────────────────────

export function useCreateCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCompetitorBody) => api.createCompetitor(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: competitorKeys.list() });
    },
  });
}

// ─── 4. useUpdateCompetitor ─────────────────────────────────

export function useUpdateCompetitor(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateCompetitorBody) => api.updateCompetitor(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: competitorKeys.detail(id!) });
      qc.invalidateQueries({ queryKey: competitorKeys.list() });
    },
  });
}

// ─── 5. useDeleteCompetitor ─────────────────────────────────

export function useDeleteCompetitor(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteCompetitor(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: competitorKeys.list() });
    },
  });
}

// ─── 6. useAnalyzeCompetitorUrl ─────────────────────────────

export function useAnalyzeCompetitorUrl() {
  return useMutation({
    mutationFn: (url: string) => api.analyzeCompetitorUrl(url),
  });
}

// ─── 7. useRefreshCompetitor ────────────────────────────────

export function useRefreshCompetitor(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.refreshCompetitor(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: competitorKeys.detail(id!) });
      qc.invalidateQueries({ queryKey: competitorKeys.list() });
    },
  });
}

// ─── 8. useToggleCompetitorLock ─────────────────────────────

export function useToggleCompetitorLock(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (locked: boolean) => api.toggleCompetitorLock(id!, locked),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: competitorKeys.detail(id!) });
      qc.invalidateQueries({ queryKey: competitorKeys.list() });
    },
  });
}

// ─── 9. useCompetitorProducts ───────────────────────────────

export function useCompetitorProducts(competitorId: string | null | undefined) {
  return useQuery({
    queryKey: competitorKeys.products(competitorId ?? ""),
    queryFn: () => api.fetchCompetitorProducts(competitorId!),
    enabled: !!competitorId,
    staleTime: 30_000,
  });
}

// ─── 10. useLinkProduct ─────────────────────────────────────

export function useLinkProduct(competitorId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => api.linkProduct(competitorId!, productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: competitorKeys.detail(competitorId!) });
      qc.invalidateQueries({ queryKey: competitorKeys.products(competitorId!) });
    },
  });
}

// ─── 11. useUnlinkProduct ───────────────────────────────────

export function useUnlinkProduct(competitorId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => api.unlinkProduct(competitorId!, productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: competitorKeys.detail(competitorId!) });
      qc.invalidateQueries({ queryKey: competitorKeys.products(competitorId!) });
    },
  });
}
