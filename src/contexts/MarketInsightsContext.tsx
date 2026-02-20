/**
 * Market Insights Context (Fase 6)
 *
 * TanStack Query-based context for market insights data.
 * No mock data fallback — returns empty array on error.
 * workspaceId is resolved server-side from session cookie.
 */

import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchInsights,
  fetchInsightById,
  fetchInsightStats,
  createInsight,
  updateInsight,
  deleteInsight,
  addInsightSource,
  deleteInsightSource,
} from "@/lib/api/insights";
import { useWorkspace } from "@/hooks/use-workspace";
import type {
  InsightWithMeta,
  InsightDetailResponse,
  InsightStats,
  InsightListParams,
  InsightListResponse,
  CreateInsightBody,
  UpdateInsightBody,
  AddInsightSourceBody,
  InsightSourceUrl,
  InsightCategory,
  ImpactLevel,
  InsightTimeframe,
} from "@/types/market-insight";

// =============================================================
// Query key factory
// =============================================================
export const insightKeys = {
  all: ["insights"] as const,
  list: (workspaceId: string, params?: InsightListParams) =>
    ["insights", "list", workspaceId, params ?? {}] as const,
  detail: (id: string) => ["insights", "detail", id] as const,
  stats: (workspaceId: string) => ["insights", "stats", workspaceId] as const,
};

// =============================================================
// Context type
// =============================================================
interface MarketInsightsContextType {
  // Data
  insights: InsightWithMeta[];
  stats: InsightStats;
  isLoading: boolean;
  error: Error | null;

  // Filters
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  categoryFilter: InsightCategory | undefined;
  setCategoryFilter: (c: InsightCategory | undefined) => void;
  impactFilter: ImpactLevel | undefined;
  setImpactFilter: (l: ImpactLevel | undefined) => void;
  timeframeFilter: InsightTimeframe | undefined;
  setTimeframeFilter: (t: InsightTimeframe | undefined) => void;
}

const MarketInsightsContext = createContext<MarketInsightsContextType | undefined>(undefined);

// =============================================================
// Provider
// =============================================================
export function MarketInsightsProvider({ children }: { children: ReactNode }) {
  const { workspaceId } = useWorkspace();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<InsightCategory | undefined>();
  const [impactFilter, setImpactFilter] = useState<ImpactLevel | undefined>();
  const [timeframeFilter, setTimeframeFilter] = useState<InsightTimeframe | undefined>();

  const listParams: InsightListParams = {
    ...(categoryFilter && { category: categoryFilter }),
    ...(impactFilter && { impactLevel: impactFilter }),
    ...(timeframeFilter && { timeframe: timeframeFilter }),
    ...(searchQuery && { search: searchQuery }),
  };

  const {
    data,
    isLoading,
    error,
  } = useQuery<InsightListResponse>({
    queryKey: insightKeys.list(workspaceId ?? "", listParams),
    queryFn: () => fetchInsights(listParams),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  return (
    <MarketInsightsContext.Provider
      value={{
        insights: data?.insights ?? [],
        stats: data?.stats ?? { active: 0, highImpact: 0, newThisMonth: 0 },
        isLoading,
        error: error as Error | null,
        searchQuery,
        setSearchQuery,
        categoryFilter,
        setCategoryFilter,
        impactFilter,
        setImpactFilter,
        timeframeFilter,
        setTimeframeFilter,
      }}
    >
      {children}
    </MarketInsightsContext.Provider>
  );
}

// =============================================================
// Hooks
// =============================================================

/**
 * Main hook: insights list + stats + filters.
 */
export function useMarketInsights() {
  const context = useContext(MarketInsightsContext);
  if (context === undefined) {
    throw new Error("useMarketInsights must be used within a MarketInsightsProvider");
  }
  return context;
}

/**
 * Hook: fetch single insight detail (includes aiResearchPrompt/Config).
 */
export function useInsightDetail(id: string | undefined) {
  return useQuery<InsightDetailResponse>({
    queryKey: insightKeys.detail(id ?? ""),
    queryFn: () => fetchInsightById(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

/**
 * Hook: fetch insight stats only (lightweight).
 */
export function useInsightStats() {
  const { workspaceId } = useWorkspace();
  return useQuery<InsightStats>({
    queryKey: insightKeys.stats(workspaceId ?? ""),
    queryFn: fetchInsightStats,
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

/**
 * Mutation: create a new insight.
 */
export function useCreateInsight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInsightBody) => createInsight(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightKeys.all });
    },
  });
}

/**
 * Mutation: update an existing insight.
 */
export function useUpdateInsight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateInsightBody }) =>
      updateInsight(id, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: insightKeys.all });
      queryClient.invalidateQueries({ queryKey: insightKeys.detail(variables.id) });
    },
  });
}

/**
 * Mutation: delete an insight.
 */
export function useDeleteInsight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInsight(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightKeys.all });
    },
  });
}

/**
 * Mutation: add a source URL to an insight.
 */
export function useAddInsightSource() {
  const queryClient = useQueryClient();
  return useMutation<InsightSourceUrl, Error, { insightId: string; body: AddInsightSourceBody }>({
    mutationFn: ({ insightId, body }) => addInsightSource(insightId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: insightKeys.all });
      queryClient.invalidateQueries({ queryKey: insightKeys.detail(variables.insightId) });
    },
  });
}

/**
 * Mutation: remove a source URL from an insight.
 */
export function useDeleteInsightSource() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { insightId: string; sourceId: string }>({
    mutationFn: ({ insightId, sourceId }) => deleteInsightSource(insightId, sourceId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: insightKeys.all });
      queryClient.invalidateQueries({ queryKey: insightKeys.detail(variables.insightId) });
    },
  });
}
