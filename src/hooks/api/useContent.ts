"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, PaginatedResponse } from "@/lib/api/client";
import type { CreateContentInput } from "@/lib/validations/content";

export interface Content {
  id: string;
  title: string;
  body: string | null;
  type: string;
  status: string;
  onBrand: boolean;
  brandScore: number | null;
  wordCount: number | null;
  campaignId: string;
  workspaceId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string | null; email: string };
}

interface UseContentParams {
  workspaceId: string;
  campaignId?: string;
  type?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function useContent({ workspaceId, campaignId, type, status, search, limit = 20, offset = 0 }: UseContentParams) {
  return useQuery({
    queryKey: ["strategy", "content", { workspaceId, campaignId, type, status, search, limit, offset }],
    queryFn: () =>
      api.get<PaginatedResponse<Content>>("/api/content", {
        workspaceId,
        campaignId,
        type,
        status,
        search,
        limit,
        offset,
      }),
    enabled: !!workspaceId,
  });
}

export function useContentItem(id: string) {
  return useQuery({
    queryKey: ["strategy", "content", id],
    queryFn: () => api.get<Content>(`/api/content/${id}`),
    enabled: !!id,
  });
}

export function useCreateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContentInput) =>
      api.post<Content>("/api/content", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategy", "content"] });
      queryClient.invalidateQueries({ queryKey: ["strategy", "campaigns"] });
    },
  });
}

export function useUpdateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: unknown }) =>
      api.patch<Content>(`/api/content/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategy", "content"] });
    },
  });
}

export function useDeleteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/content/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategy", "content"] });
      queryClient.invalidateQueries({ queryKey: ["strategy", "campaigns"] });
    },
  });
}
