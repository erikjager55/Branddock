"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, PaginatedResponse } from "@/lib/api/client";
import type { CreateCampaignInput } from "@/lib/validations/campaign";

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: "PLANNING" | "ACTIVE" | "COMPLETED" | "PAUSED";
  startDate: string | null;
  endDate: string | null;
  workspaceId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string | null; email: string };
  contents?: { id: string }[];
  _count?: { contents: number };
}

interface UseCampaignsParams {
  workspaceId: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function useCampaigns({ workspaceId, status, search, limit = 20, offset = 0 }: UseCampaignsParams) {
  return useQuery({
    queryKey: ["strategy", "campaigns", { workspaceId, status, search, limit, offset }],
    queryFn: () =>
      api.get<PaginatedResponse<Campaign>>("/api/campaigns", {
        workspaceId,
        status,
        search,
        limit,
        offset,
      }),
    enabled: !!workspaceId,
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ["strategy", "campaigns", id],
    queryFn: () => api.get<Campaign>(`/api/campaigns/${id}`),
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCampaignInput) =>
      api.post<Campaign>("/api/campaigns", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategy", "campaigns"] });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: unknown }) =>
      api.patch<Campaign>(`/api/campaigns/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategy", "campaigns"] });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategy", "campaigns"] });
    },
  });
}
