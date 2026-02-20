import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/strategies.api";
import type {
  CreateStrategyBody,
  UpdateStrategyBody,
  UpdateContextBody,
  CreateObjectiveBody,
  UpdateObjectiveBody,
  CreateKeyResultBody,
  UpdateKeyResultBody,
  CreateMilestoneBody,
  UpdateMilestoneBody,
} from "../types/business-strategy.types";

// ─── Query Keys ────────────────────────────────────────────

export const strategyKeys = {
  all: ["strategies"] as const,
  list: () => [...strategyKeys.all, "list"] as const,
  detail: (id: string) => [...strategyKeys.all, "detail", id] as const,
  stats: () => [...strategyKeys.all, "stats"] as const,
  objectives: (id: string) =>
    [...strategyKeys.all, id, "objectives"] as const,
};

// ─── List + Stats ──────────────────────────────────────────

export function useStrategies(status?: string) {
  return useQuery({
    queryKey: [...strategyKeys.list(), status] as const,
    queryFn: () => api.fetchStrategies(status),
    staleTime: 30_000,
  });
}

export function useStrategyStats() {
  return useQuery({
    queryKey: strategyKeys.stats(),
    queryFn: api.fetchStrategyStats,
    staleTime: 30_000,
  });
}

// ─── Detail ────────────────────────────────────────────────

export function useStrategyDetail(id: string | null | undefined) {
  return useQuery({
    queryKey: strategyKeys.detail(id ?? ""),
    queryFn: () => api.fetchStrategyDetail(id!),
    enabled: !!id,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

// ─── Create ────────────────────────────────────────────────

export function useCreateStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStrategyBody) => api.createStrategy(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: strategyKeys.list() });
      qc.invalidateQueries({ queryKey: strategyKeys.stats() });
    },
  });
}

// ─── Update ────────────────────────────────────────────────

export function useUpdateStrategy(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateStrategyBody) => api.updateStrategy(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: strategyKeys.detail(id!) });
      qc.invalidateQueries({ queryKey: strategyKeys.list() });
    },
  });
}

// ─── Archive ───────────────────────────────────────────────

export function useArchiveStrategy(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.archiveStrategy(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: strategyKeys.detail(id!) });
      qc.invalidateQueries({ queryKey: strategyKeys.list() });
      qc.invalidateQueries({ queryKey: strategyKeys.stats() });
    },
  });
}

// ─── Delete ────────────────────────────────────────────────

export function useDeleteStrategy(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteStrategy(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: strategyKeys.list() });
      qc.invalidateQueries({ queryKey: strategyKeys.stats() });
    },
  });
}

// ─── Context ───────────────────────────────────────────────

export function useUpdateContext(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateContextBody) => api.updateContext(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: strategyKeys.detail(id!) });
    },
  });
}

// ─── Objectives ────────────────────────────────────────────

export function useObjectives(id: string | undefined) {
  return useQuery({
    queryKey: strategyKeys.objectives(id ?? ""),
    queryFn: () => api.fetchObjectives(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useAddObjective(strategyId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateObjectiveBody) =>
      api.addObjective(strategyId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: strategyKeys.detail(strategyId!) });
      qc.invalidateQueries({
        queryKey: strategyKeys.objectives(strategyId!),
      });
      qc.invalidateQueries({ queryKey: strategyKeys.stats() });
    },
  });
}

export function useUpdateObjective(
  strategyId: string | undefined,
  objectiveId: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateObjectiveBody) =>
      api.updateObjective(strategyId!, objectiveId!, data),
    onSuccess: () => {
      api.recalculateProgress(strategyId!).then(() => {
        qc.invalidateQueries({ queryKey: strategyKeys.detail(strategyId!) });
        qc.invalidateQueries({ queryKey: strategyKeys.list() });
        qc.invalidateQueries({ queryKey: strategyKeys.stats() });
      });
      qc.invalidateQueries({
        queryKey: strategyKeys.objectives(strategyId!),
      });
    },
  });
}

export function useDeleteObjective(
  strategyId: string | undefined,
  objectiveId: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteObjective(strategyId!, objectiveId!),
    onSuccess: () => {
      api.recalculateProgress(strategyId!).then(() => {
        qc.invalidateQueries({ queryKey: strategyKeys.detail(strategyId!) });
        qc.invalidateQueries({ queryKey: strategyKeys.list() });
        qc.invalidateQueries({ queryKey: strategyKeys.stats() });
      });
      qc.invalidateQueries({
        queryKey: strategyKeys.objectives(strategyId!),
      });
    },
  });
}

export function useReorderObjectives(strategyId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (objectiveIds: string[]) =>
      api.reorderObjectives(strategyId!, objectiveIds),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: strategyKeys.objectives(strategyId!),
      });
    },
  });
}

// ─── Key Results ───────────────────────────────────────────

export function useAddKeyResult(
  strategyId: string | undefined,
  objectiveId: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateKeyResultBody) =>
      api.addKeyResult(strategyId!, objectiveId!, data),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: strategyKeys.objectives(strategyId!),
      });
    },
  });
}

export function useUpdateKeyResult(
  strategyId: string | undefined,
  objectiveId: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      keyResultId,
      data,
    }: {
      keyResultId: string;
      data: UpdateKeyResultBody;
    }) => api.updateKeyResult(strategyId!, objectiveId!, keyResultId, data),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: strategyKeys.objectives(strategyId!),
      });
    },
  });
}

export function useDeleteKeyResult(
  strategyId: string | undefined,
  objectiveId: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keyResultId: string) =>
      api.deleteKeyResult(strategyId!, objectiveId!, keyResultId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: strategyKeys.objectives(strategyId!),
      });
    },
  });
}

// ─── Milestones ────────────────────────────────────────────

export function useAddMilestone(strategyId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMilestoneBody) =>
      api.addMilestone(strategyId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: strategyKeys.detail(strategyId!) });
    },
  });
}

export function useUpdateMilestone(
  strategyId: string | undefined,
  milestoneId: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateMilestoneBody) =>
      api.updateMilestone(strategyId!, milestoneId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: strategyKeys.detail(strategyId!) });
    },
  });
}

export function useDeleteMilestone(
  strategyId: string | undefined,
  milestoneId: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteMilestone(strategyId!, milestoneId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: strategyKeys.detail(strategyId!) });
    },
  });
}

// ─── Focus Areas ───────────────────────────────────────────

export function useAddFocusArea(strategyId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      icon?: string;
      color?: string;
    }) => api.addFocusArea(strategyId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: strategyKeys.detail(strategyId!) });
    },
  });
}

// ─── Recalculate ───────────────────────────────────────────

export function useRecalculateProgress(strategyId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.recalculateProgress(strategyId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: strategyKeys.detail(strategyId!) });
      qc.invalidateQueries({ queryKey: strategyKeys.list() });
      qc.invalidateQueries({ queryKey: strategyKeys.stats() });
    },
  });
}
