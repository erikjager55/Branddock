"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, PaginatedResponse } from "@/lib/api/client";
import type {
  CreateStrategyInput,
  UpdateStrategyInput,
} from "@/lib/validations/strategy";

export interface BusinessStrategy {
  id: string;
  type: string;
  title: string;
  description: string | null;
  status: string;
  content: Record<string, unknown> | null;
  isLocked: boolean;
  workspaceId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

interface UseStrategiesParams {
  workspaceId?: string;
  type?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function useStrategies({
  workspaceId,
  type,
  status,
  search,
  limit = 20,
  offset = 0,
}: UseStrategiesParams) {
  return useQuery({
    queryKey: [
      "knowledge",
      "strategies",
      { workspaceId, type, status, search, limit, offset },
    ],
    queryFn: () =>
      api.get<PaginatedResponse<BusinessStrategy>>("/api/strategies", {
        workspaceId,
        type,
        status,
        search,
        limit,
        offset,
      }),
  });
}

export function useStrategy(strategyId: string) {
  return useQuery({
    queryKey: ["knowledge", "strategies", strategyId],
    queryFn: () =>
      api.get<BusinessStrategy>(`/api/strategies/${strategyId}`),
    enabled: !!strategyId,
  });
}

export function useCreateStrategy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStrategyInput) =>
      api.post<BusinessStrategy>("/api/strategies", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "strategies"],
      });
    },
  });
}

export function useUpdateStrategy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      strategyId,
      ...data
    }: { strategyId: string } & UpdateStrategyInput) =>
      api.patch<BusinessStrategy>(
        `/api/strategies/${strategyId}`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "strategies"],
      });
    },
  });
}

export function useDeleteStrategy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (strategyId: string) =>
      api.delete(`/api/strategies/${strategyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "strategies"],
      });
    },
  });
}
