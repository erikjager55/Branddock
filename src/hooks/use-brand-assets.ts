import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchBrandAssets, createBrandAsset } from "@/lib/api/brand-assets";
import type {
  BrandAssetListParams,
  BrandAssetListResponse,
  CreateBrandAssetBody,
} from "@/types/brand-asset";

// Query key factory — houdt cache keys consistent
export const brandAssetKeys = {
  all: ["brand-assets"] as const,
  list: (workspaceId: string, params?: BrandAssetListParams) =>
    ["brand-assets", "list", workspaceId, params ?? {}] as const,
};

/**
 * Hook: haal brand assets op voor een workspace met optionele filters.
 *
 * Gebruik:
 *   const { data, isLoading, error } = useBrandAssets(workspaceId);
 *   const { data } = useBrandAssets(workspaceId, { category: "STRATEGY" });
 */
export function useBrandAssets(
  workspaceId: string | undefined,
  params?: BrandAssetListParams
) {
  return useQuery<BrandAssetListResponse>({
    queryKey: brandAssetKeys.list(workspaceId ?? "", params),
    queryFn: () => fetchBrandAssets(workspaceId!, params),
    enabled: !!workspaceId,
    staleTime: 30_000, // 30s — brand assets wijzigen niet vaak
  });
}

/**
 * Hook: maak een nieuw brand asset aan.
 * Invalidate automatisch de lijst-cache na succes.
 *
 * Gebruik:
 *   const { mutate, isPending } = useCreateBrandAsset(workspaceId);
 *   mutate({ name: "Brand Promise", category: "STRATEGY" });
 */
export function useCreateBrandAsset(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateBrandAssetBody) =>
      createBrandAsset(workspaceId, body),
    onSuccess: () => {
      // Invalidate all brand asset lists for this workspace
      queryClient.invalidateQueries({
        queryKey: brandAssetKeys.all,
      });
    },
  });
}
