"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, PaginatedResponse } from "@/lib/api/client";

export interface Goal {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string | null;
  status: "ON_TRACK" | "BEHIND" | "COMPLETED";
  workspaceId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string | null; email: string };
}

interface UseGoalsParams {
  workspaceId: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export function useGoals({ workspaceId, status, limit = 20, offset = 0 }: UseGoalsParams) {
  return useQuery({
    queryKey: ["strategy", "goals", { workspaceId, status, limit, offset }],
    queryFn: () =>
      api.get<PaginatedResponse<Goal>>("/api/goals", {
        workspaceId,
        status,
        limit,
        offset,
      }),
    enabled: !!workspaceId,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      targetValue: number;
      currentValue?: number;
      unit: string;
      deadline?: string | null;
      status?: "ON_TRACK" | "BEHIND" | "COMPLETED";
      workspaceId: string;
    }) => api.post<Goal>("/api/goals", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategy", "goals"] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: unknown }) =>
      api.patch<Goal>(`/api/goals/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategy", "goals"] });
    },
  });
}
