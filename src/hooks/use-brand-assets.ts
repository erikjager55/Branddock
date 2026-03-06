import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchBrandAssets, createBrandAsset } from "@/lib/api/brand-assets";
import type {
  BrandAssetListParams,
  BrandAssetListResponse,
  CreateBrandAssetBody,
} from "@/types/brand-asset";

// Query key factory — keeps cache keys consistent
export const brandAssetKeys = {
  all: ["brand-assets"] as const,
  list: (workspaceId: string, params?: BrandAssetListParams) =>
    ["brand-assets", "list", workspaceId, params ?? {}] as const,
};

/**
 * Hook: fetch brand assets with optional filters.
 * workspaceId is only used as cache key; server resolves workspace via session.
 *
 * Usage:
 *   const { data, isLoading, error } = useBrandAssetsQuery(workspaceId);
 *   const { data } = useBrandAssetsQuery(workspaceId, { category: "STRATEGY" });
 */
export function useBrandAssetsQuery(
  workspaceId: string | undefined,
  params?: BrandAssetListParams
) {
  return useQuery<BrandAssetListResponse>({
    queryKey: brandAssetKeys.list(workspaceId ?? "", params),
    queryFn: () => fetchBrandAssets(params),
    enabled: !!workspaceId,
    staleTime: 30_000, // 30s — brand assets don't change often
  });
}

/**
 * Hook: create a new brand asset.
 * Automatically invalidates the list cache on success.
 *
 * Usage:
 *   const { mutate, isPending } = useCreateBrandAsset();
 *   mutate({ name: "Brand Promise", category: "STRATEGY" });
 */
export function useCreateBrandAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateBrandAssetBody) =>
      createBrandAsset(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: brandAssetKeys.all,
      });
    },
  });
}
