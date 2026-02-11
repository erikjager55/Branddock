"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, PaginatedResponse } from "@/lib/api/client";
import type {
  CreateStrategyInput,
  UpdateStrategyInput,
} from "@/lib/validations/strategy";

export interface KeyResultData {
  id: string;
  description: string;
  targetValue: string | null;
  currentValue: string | null;
  status: string;
  sortOrder: number;
}

export interface ObjectiveData {
  id: string;
  title: string;
  description: string | null;
  focusArea: string | null;
  priority: string;
  status: string;
  metricType: string;
  startValue: number;
  targetValue: number;
  currentValue: number;
  sortOrder: number;
  linkedCampaigns: unknown;
  keyResults: KeyResultData[];
}

export interface MilestoneData {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  quarter: string | null;
  completed: boolean;
  completedAt: string | null;
  sortOrder: number;
}

export interface BusinessStrategy {
  id: string;
  type: string;
  title: string;
  description: string | null;
  status: string;
  content: Record<string, unknown> | null;
  isLocked: boolean;
  icon: string | null;
  startDate: string | null;
  endDate: string | null;
  vision: string | null;
  rationale: string | null;
  assumptions: string[] | null;
  focusAreas: string[] | null;
  workspaceId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  objectives?: ObjectiveData[];
  milestones?: MilestoneData[];
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

// ─── Objectives ────────────────────────────────────────

export function useCreateObjective(strategyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      focusArea?: string;
      priority?: string;
      metricType?: string;
      startValue?: string;
      targetValue?: string;
      currentValue?: string;
      keyResults?: string[];
    }) =>
      api.post<{ data: ObjectiveData }>(
        `/api/strategies/${strategyId}/objectives`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "strategies"],
      });
    },
  });
}

export function useUpdateObjective(strategyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      objectiveId: string;
      title?: string;
      description?: string;
      focusArea?: string;
      priority?: string;
      status?: string;
      currentValue?: number;
      targetValue?: number;
    }) =>
      api.patch<{ data: ObjectiveData }>(
        `/api/strategies/${strategyId}/objectives`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "strategies"],
      });
    },
  });
}

export function useDeleteObjective(strategyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (objectiveId: string) =>
      api.delete(
        `/api/strategies/${strategyId}/objectives?objectiveId=${objectiveId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "strategies"],
      });
    },
  });
}

// ─── Key Results ───────────────────────────────────────

export function useCreateKeyResult(objectiveId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { description: string; targetValue?: string }) =>
      api.post<{ data: KeyResultData }>(
        `/api/objectives/${objectiveId}/key-results`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "strategies"],
      });
    },
  });
}

export function useUpdateKeyResult(objectiveId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      keyResultId: string;
      currentValue?: string;
      status?: string;
    }) =>
      api.patch<{ data: KeyResultData }>(
        `/api/objectives/${objectiveId}/key-results`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "strategies"],
      });
    },
  });
}

export function useDeleteKeyResult(objectiveId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keyResultId: string) =>
      api.delete(
        `/api/objectives/${objectiveId}/key-results?keyResultId=${keyResultId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "strategies"],
      });
    },
  });
}

// ─── Milestones ────────────────────────────────────────

export function useCreateMilestone(strategyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      dueDate: string;
      quarter?: string;
    }) =>
      api.post<{ data: MilestoneData }>(
        `/api/strategies/${strategyId}/milestones`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "strategies"],
      });
    },
  });
}

export function useToggleMilestone(strategyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { milestoneId: string; completed: boolean }) =>
      api.patch<{ data: MilestoneData }>(
        `/api/strategies/${strategyId}/milestones`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "strategies"],
      });
    },
  });
}

export function useDeleteMilestone(strategyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (milestoneId: string) =>
      api.delete(
        `/api/strategies/${strategyId}/milestones?milestoneId=${milestoneId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "strategies"],
      });
    },
  });
}
