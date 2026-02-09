"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, PaginatedResponse } from "@/lib/api/client";

export interface MarketInsight {
  id: string;
  title: string;
  source: string | null;
  type: "TREND" | "COMPETITOR" | "INDUSTRY";
  summary: string | null;
  content: string | null;
  workspaceId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string | null; email: string };
}

interface UseMarketInsightsParams {
  workspaceId: string;
  type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function useMarketInsights({ workspaceId, type, search, limit = 20, offset = 0 }: UseMarketInsightsParams) {
  return useQuery({
    queryKey: ["knowledge", "market-insights", { workspaceId, type, search, limit, offset }],
    queryFn: () =>
      api.get<PaginatedResponse<MarketInsight>>("/api/market-insights", {
        workspaceId,
        type,
        search,
        limit,
        offset,
      }),
    enabled: !!workspaceId,
  });
}

export function useCreateMarketInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      source?: string;
      type: "TREND" | "COMPETITOR" | "INDUSTRY";
      summary?: string;
      content?: string;
      workspaceId: string;
    }) => api.post<MarketInsight>("/api/market-insights", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge", "market-insights"] });
    },
  });
}
