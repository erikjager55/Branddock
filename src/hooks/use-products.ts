import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProducts, createProduct } from "@/lib/api/products";
import type {
  ProductListParams,
  ProductListResponse,
  CreateProductBody,
} from "@/types/product";

export const productKeys = {
  all: ["products"] as const,
  list: (workspaceId: string, params?: ProductListParams) =>
    ["products", "list", workspaceId, params ?? {}] as const,
};

/**
 * Hook: haal products op voor een workspace.
 */
export function useProducts(
  workspaceId: string | undefined,
  params?: ProductListParams
) {
  return useQuery<ProductListResponse>({
    queryKey: productKeys.list(workspaceId ?? "", params),
    queryFn: () => fetchProducts(workspaceId!, params),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

/**
 * Hook: maak een nieuw product aan.
 */
export function useCreateProduct(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateProductBody) =>
      createProduct(workspaceId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productKeys.all,
      });
    },
  });
}
