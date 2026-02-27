import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAssetDetail,
  updateAssetContent,
  updateAssetStatus,
  toggleAssetLock,
  duplicateAsset,
  deleteAsset,
  regenerateAssetContent,
  fetchAssetVersions,
  updateAssetFramework,
} from "../api/brand-asset-detail.api";
import type {
  ContentUpdatePayload,
  StatusUpdatePayload,
  FrameworkUpdatePayload,
} from "../types/brand-asset-detail.types";

const assetDetailKeys = {
  all: ["brand-asset-detail"] as const,
  detail: (id: string) => [...assetDetailKeys.all, id] as const,
  versions: (id: string) => [...assetDetailKeys.all, id, "versions"] as const,
};

export function useAssetDetail(id: string | null) {
  return useQuery({
    queryKey: assetDetailKeys.detail(id ?? ""),
    queryFn: () => fetchAssetDetail(id!),
    enabled: !!id,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useAssetVersions(id: string | null, limit = 20, offset = 0) {
  return useQuery({
    queryKey: [...assetDetailKeys.versions(id ?? ""), limit, offset],
    queryFn: () => fetchAssetVersions(id!, limit, offset),
    enabled: !!id,
  });
}

export function useUpdateContent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ContentUpdatePayload) =>
      updateAssetContent(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assetDetailKeys.detail(id) });
      qc.invalidateQueries({ queryKey: assetDetailKeys.versions(id) });
      qc.invalidateQueries({ queryKey: ["brand-assets"] });
    },
  });
}

export function useUpdateStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: StatusUpdatePayload) =>
      updateAssetStatus(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assetDetailKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ["brand-assets"] });
    },
  });
}

export function useToggleLock(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => toggleAssetLock(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assetDetailKeys.detail(id) });
    },
  });
}

export function useDuplicateAsset(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => duplicateAsset(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brand-assets"] });
    },
  });
}

export function useDeleteAsset(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAsset(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brand-assets"] });
    },
  });
}

export function useUpdateFramework(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: FrameworkUpdatePayload) =>
      updateAssetFramework(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assetDetailKeys.detail(id) });
      qc.invalidateQueries({ queryKey: assetDetailKeys.versions(id) });
      qc.invalidateQueries({ queryKey: ["brand-assets"] });
    },
  });
}

export function useRegenerateContent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (instructions?: string) =>
      regenerateAssetContent(id, instructions),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assetDetailKeys.detail(id) });
      qc.invalidateQueries({ queryKey: assetDetailKeys.versions(id) });
    },
  });
}
