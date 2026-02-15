import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTrends, createTrend } from "@/lib/api/trends";
import type { TrendListResponse, TrendListParams, CreateTrendBody } from "@/types/trend";

export const trendKeys = {
  all: ["trends"] as const,
  list: (workspaceId: string, params?: TrendListParams) =>
    ["trends", "list", workspaceId, params ?? {}] as const,
};

export function useTrends(workspaceId: string | undefined, params?: TrendListParams) {
  return useQuery<TrendListResponse>({
    queryKey: trendKeys.list(workspaceId ?? "", params),
    queryFn: () => fetchTrends(workspaceId!, params),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

export function useCreateTrend(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTrendBody) => createTrend(workspaceId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: trendKeys.all }),
  });
}
