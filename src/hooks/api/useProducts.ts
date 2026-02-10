"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, PaginatedResponse } from "@/lib/api/client";
import type {
  CreateProductInput,
  UpdateProductInput,
} from "@/lib/validations/product";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  source: "MANUAL" | "WEBSITE_URL" | "PDF_UPLOAD";
  sourceUrl: string | null;
  status: "DRAFT" | "ANALYZING" | "ANALYZED";
  pricingModel: string | null;
  pricingDetails: string | null;
  features: string[] | null;
  benefits: unknown[] | null;
  useCases: unknown[] | null;
  targetAudience: unknown[] | null;
  analyzedAt: string | null;
  analysisSteps: unknown[] | null;
  workspaceId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  personas?: Array<{
    id: string;
    personaId: string;
    persona: { id: string; name: string; imageUrl: string | null };
  }>;
}

interface UseProductsParams {
  workspaceId?: string;
  category?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function useProducts({
  workspaceId,
  category,
  status,
  search,
  limit = 20,
  offset = 0,
}: UseProductsParams) {
  return useQuery({
    queryKey: [
      "knowledge",
      "products",
      { workspaceId, category, status, search, limit, offset },
    ],
    queryFn: () =>
      api.get<PaginatedResponse<Product>>("/api/products", {
        workspaceId,
        category,
        status,
        search,
        limit,
        offset,
      }),
  });
}

export function useProduct(productId: string) {
  return useQuery({
    queryKey: ["knowledge", "products", productId],
    queryFn: () => api.get<Product>(`/api/products/${productId}`),
    enabled: !!productId,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductInput) =>
      api.post<Product>("/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "products"],
      });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      ...data
    }: { productId: string } & UpdateProductInput) =>
      api.patch<Product>(`/api/products/${productId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "products"],
      });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) =>
      api.delete(`/api/products/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "products"],
      });
    },
  });
}

export function useAnalyzeUrl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { url: string; workspaceId: string }) =>
      api.post<Product>("/api/products/analyze-url", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "products"],
      });
    },
  });
}

export function useLinkPersona() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      personaId,
    }: {
      productId: string;
      personaId: string;
    }) =>
      api.post<{ success: boolean }>(
        `/api/products/${productId}/personas`,
        { personaId }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "products"],
      });
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "personas"],
      });
    },
  });
}

export function useUnlinkPersona() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      personaId,
    }: {
      productId: string;
      personaId: string;
    }) =>
      api.delete(`/api/products/${productId}/personas?personaId=${personaId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "products"],
      });
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "personas"],
      });
    },
  });
}
