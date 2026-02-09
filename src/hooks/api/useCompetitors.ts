"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, PaginatedResponse } from "@/lib/api/client";

export interface Competitor {
  id: string;
  name: string;
  website: string | null;
  description: string | null;
  strengths: string[];
  weaknesses: string[];
  workspaceId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string | null; email: string };
}

interface UseCompetitorsParams {
  workspaceId: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function useCompetitors({ workspaceId, search, limit = 20, offset = 0 }: UseCompetitorsParams) {
  return useQuery({
    queryKey: ["strategy", "competitors", { workspaceId, search, limit, offset }],
    queryFn: () =>
      api.get<PaginatedResponse<Competitor>>("/api/competitors", {
        workspaceId,
        search,
        limit,
        offset,
      }),
    enabled: !!workspaceId,
  });
}

export function useCreateCompetitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      website?: string | null;
      description?: string;
      strengths?: string[];
      weaknesses?: string[];
      workspaceId: string;
    }) => api.post<Competitor>("/api/competitors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategy", "competitors"] });
    },
  });
}
