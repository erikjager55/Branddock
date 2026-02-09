"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, PaginatedResponse } from "@/lib/api/client";
import type { CreateResearchInput } from "@/lib/validations/research";

export interface ResearchProject {
  id: string;
  name: string;
  type: "SURVEY" | "INTERVIEW" | "ANALYSIS" | "AI_EXPLORATION";
  status: "DRAFT" | "ACTIVE" | "COMPLETED";
  description: string | null;
  findings: Record<string, unknown> | null;
  participantCount: number | null;
  startDate: string | null;
  endDate: string | null;
  workspaceId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string | null; email: string };
}

interface UseResearchParams {
  workspaceId: string;
  type?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function useResearch({ workspaceId, type, status, search, limit = 20, offset = 0 }: UseResearchParams) {
  return useQuery({
    queryKey: ["validation", "research", { workspaceId, type, status, search, limit, offset }],
    queryFn: () =>
      api.get<PaginatedResponse<ResearchProject>>("/api/research", {
        workspaceId,
        type,
        status,
        search,
        limit,
        offset,
      }),
    enabled: !!workspaceId,
  });
}

export function useCreateResearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateResearchInput) =>
      api.post<ResearchProject>("/api/research", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["validation", "research"] });
    },
  });
}
