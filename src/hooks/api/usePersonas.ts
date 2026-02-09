"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, PaginatedResponse } from "@/lib/api/client";
import type { CreatePersonaInput } from "@/lib/validations/persona";

export interface Persona {
  id: string;
  name: string;
  role: string | null;
  description: string | null;
  avatar: string | null;
  demographics: Record<string, unknown> | null;
  goals: string[];
  painPoints: string[];
  tags: string[];
  workspaceId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string | null; email: string };
}

interface UsePersonasParams {
  workspaceId: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function usePersonas({ workspaceId, search, limit = 20, offset = 0 }: UsePersonasParams) {
  return useQuery({
    queryKey: ["knowledge", "personas", { workspaceId, search, limit, offset }],
    queryFn: () =>
      api.get<PaginatedResponse<Persona>>("/api/personas", {
        workspaceId,
        search,
        limit,
        offset,
      }),
    enabled: !!workspaceId,
  });
}

export function usePersona(id: string) {
  return useQuery({
    queryKey: ["knowledge", "personas", id],
    queryFn: () => api.get<Persona>(`/api/personas/${id}`),
    enabled: !!id,
  });
}

export function useCreatePersona() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePersonaInput) =>
      api.post<Persona>("/api/personas", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge", "personas"] });
    },
  });
}

export function useUpdatePersona() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: unknown }) =>
      api.patch<Persona>(`/api/personas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge", "personas"] });
    },
  });
}

export function useDeletePersona() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/personas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge", "personas"] });
    },
  });
}
