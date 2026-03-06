import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/products.api";
import type {
  CreateProductBody,
  UpdateProductBody,
  ProductListParams,
  AddImageBody,
  UpdateImageBody,
  ReorderImagesBody,
} from "../types/product.types";

// ─── Query Keys ─────────────────────────────────────────────

export const productKeys = {
  all: ["products"] as const,
  list: () => [...productKeys.all, "list"] as const,
  detail: (id: string) => [...productKeys.all, "detail", id] as const,
  personas: (id: string) => [...productKeys.all, "personas", id] as const,
  images: (id: string) => [...productKeys.all, "images", id] as const,
};

// ─── 1. useProducts ─────────────────────────────────────────

export function useProducts(params?: ProductListParams) {
  return useQuery({
    queryKey: [...productKeys.list(), params] as const,
    queryFn: () => api.fetchProducts(params),
    staleTime: 30_000,
  });
}

// ─── 2. useProductDetail ────────────────────────────────────

export function useProductDetail(id: string | null | undefined) {
  return useQuery({
    queryKey: productKeys.detail(id ?? ""),
    queryFn: () => api.fetchProductDetail(id!),
    enabled: !!id,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

// ─── 3. useCreateProduct ────────────────────────────────────

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductBody) => api.createProduct(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.list() });
    },
  });
}

// ─── 4. useUpdateProduct ────────────────────────────────────

export function useUpdateProduct(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProductBody) => api.updateProduct(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.detail(id!) });
      qc.invalidateQueries({ queryKey: productKeys.list() });
    },
  });
}

// ─── 5. useDeleteProduct ────────────────────────────────────

export function useDeleteProduct(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteProduct(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.list() });
    },
  });
}

// ─── 6. useAnalyzeUrl ───────────────────────────────────────

export function useAnalyzeUrl() {
  return useMutation({
    mutationFn: (url: string) => api.analyzeUrl(url),
  });
}

// ─── 7. useAnalyzePdf ───────────────────────────────────────

export function useAnalyzePdf() {
  return useMutation({
    mutationFn: (file: File) => api.analyzePdf(file),
  });
}

// ─── 8. useLinkPersona ─────────────────────────────────────

export function useLinkPersona(productId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (personaId: string) => api.linkPersona(productId!, personaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.detail(productId!) });
      qc.invalidateQueries({ queryKey: productKeys.personas(productId!) });
    },
  });
}

// ─── 9. useUnlinkPersona ───────────────────────────────────

export function useUnlinkPersona(productId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (personaId: string) =>
      api.unlinkPersona(productId!, personaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.detail(productId!) });
      qc.invalidateQueries({ queryKey: productKeys.personas(productId!) });
    },
  });
}

// ─── 10. useProductPersonas ─────────────────────────────────

export function useProductPersonas(productId: string | null | undefined) {
  return useQuery({
    queryKey: productKeys.personas(productId ?? ""),
    queryFn: () => api.fetchProductPersonas(productId!),
    enabled: !!productId,
    staleTime: 30_000,
  });
}

// ─── 11. useAddProductImage ─────────────────────────────────

export function useAddProductImage(productId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AddImageBody) =>
      api.addProductImage(productId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.detail(productId!) });
      qc.invalidateQueries({ queryKey: productKeys.list() });
    },
  });
}

// ─── 11b. useUploadProductImage ────────────────────────────

export function useUploadProductImage(productId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, category, altText }: { file: File; category?: string; altText?: string }) =>
      api.uploadProductImage(productId!, file, category, altText),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.detail(productId!) });
      qc.invalidateQueries({ queryKey: productKeys.list() });
    },
  });
}

// ─── 12. useUpdateProductImage ──────────────────────────────

export function useUpdateProductImage(productId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ imageId, ...body }: UpdateImageBody & { imageId: string }) =>
      api.updateProductImage(productId!, imageId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.detail(productId!) });
    },
  });
}

// ─── 13. useDeleteProductImage ──────────────────────────────

export function useDeleteProductImage(productId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) =>
      api.deleteProductImage(productId!, imageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.detail(productId!) });
      qc.invalidateQueries({ queryKey: productKeys.list() });
    },
  });
}

// ─── 14. useReorderProductImages ────────────────────────────

export function useReorderProductImages(productId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReorderImagesBody) =>
      api.reorderProductImages(productId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.detail(productId!) });
    },
  });
}
