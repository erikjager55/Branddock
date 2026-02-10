"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, PaginatedResponse } from "@/lib/api/client";
import { BrandAssetWithRelations, AssetType, AssetStatus } from "@/types/brand-asset";

interface UseAssetsParams {
  workspaceId?: string;
  type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function useAssets({ workspaceId, type, search, limit = 20, offset = 0 }: UseAssetsParams) {
  return useQuery({
    queryKey: ["knowledge", "assets", { workspaceId, type, search, limit, offset }],
    queryFn: () =>
      api.get<PaginatedResponse<BrandAssetWithRelations>>("/api/brand-assets", {
        workspaceId,
        type,
        search,
        limit,
        offset,
      }),
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ["knowledge", "assets", id],
    queryFn: () => api.get<BrandAssetWithRelations>(`/api/brand-assets/${id}`),
    enabled: !!id,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      type: AssetType;
      status?: AssetStatus;
      content?: Record<string, unknown>;
      workspaceId: string;
    }) => api.post<BrandAssetWithRelations>("/api/brand-assets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge", "assets"] });
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: unknown }) =>
      api.patch<BrandAssetWithRelations>(`/api/brand-assets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge", "assets"] });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/brand-assets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge", "assets"] });
    },
  });
}

export function useLockAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assetId,
      isLocked,
    }: {
      assetId: string;
      isLocked: boolean;
    }) =>
      api.patch<BrandAssetWithRelations>(`/api/assets/${assetId}/lock`, {
        isLocked,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge", "assets"] });
    },
  });
}

export interface AssetStats {
  total: number;
  validated: number;
  inProgress: number;
  draft: number;
  averageValidationScore: number;
}

export function useAssetStats() {
  return useQuery({
    queryKey: ["knowledge", "assets", "stats"],
    queryFn: () => api.get<AssetStats>("/api/assets/stats"),
  });
}
