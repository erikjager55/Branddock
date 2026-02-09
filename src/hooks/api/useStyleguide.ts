"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type {
  CreateStyleguideInput,
  UpdateStyleguideInput,
} from "@/lib/validations/styleguide";

export interface BrandStyleguide {
  id: string;
  sourceUrl: string | null;
  sourceType: string | null;
  logo: Record<string, unknown> | null;
  colors: Record<string, unknown> | null;
  typography: Record<string, unknown> | null;
  toneOfVoice: Record<string, unknown> | null;
  imagery: Record<string, unknown> | null;
  workspaceId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export function useStyleguide(workspaceId: string) {
  return useQuery({
    queryKey: ["knowledge", "styleguide", workspaceId],
    queryFn: () =>
      api.get<BrandStyleguide>("/api/styleguide", { workspaceId }),
    enabled: !!workspaceId,
  });
}

export function useCreateStyleguide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStyleguideInput & { workspaceId: string }) =>
      api.post<BrandStyleguide>("/api/styleguide", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "styleguide"],
      });
    },
  });
}

export function useUpdateStyleguide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateStyleguideInput) =>
      api.patch<BrandStyleguide>("/api/styleguide", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "styleguide"],
      });
    },
  });
}

export function useUpdateStyleguideSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      section,
      ...data
    }: {
      section: string;
      [key: string]: unknown;
    }) =>
      api.patch<BrandStyleguide>(`/api/styleguide/${section}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "styleguide"],
      });
    },
  });
}
