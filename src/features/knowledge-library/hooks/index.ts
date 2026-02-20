import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchResources,
  fetchFeaturedResources,
  fetchResourceDetail,
  createResource,
  updateResource,
  deleteResource,
  toggleArchive,
  toggleFavorite,
  toggleFeatured,
  importUrl,
  uploadFile,
} from "../api/knowledge-resources.api";
import type {
  ResourceListParams,
  CreateResourceBody,
  ImportUrlBody,
  ResourceWithMeta,
  ResourceListResponse,
} from "../types/knowledge-library.types";

export const resourceKeys = {
  all: ["knowledge-resources"] as const,
  list: (filters?: ResourceListParams) =>
    [...resourceKeys.all, "list", filters] as const,
  detail: (id: string) => [...resourceKeys.all, "detail", id] as const,
  featured: () => [...resourceKeys.all, "featured"] as const,
  types: () => [...resourceKeys.all, "types"] as const,
  categories: () => [...resourceKeys.all, "categories"] as const,
};

// 1. useResources
export function useResources(filters?: ResourceListParams) {
  return useQuery({
    queryKey: resourceKeys.list(filters),
    queryFn: () => fetchResources(filters),
    staleTime: 30_000,
  });
}

// 2. useFeaturedResources
export function useFeaturedResources() {
  return useQuery({
    queryKey: resourceKeys.featured(),
    queryFn: fetchFeaturedResources,
    staleTime: 30_000,
  });
}

// 3. useResourceDetail
export function useResourceDetail(id: string) {
  return useQuery({
    queryKey: resourceKeys.detail(id),
    queryFn: () => fetchResourceDetail(id),
    enabled: !!id,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

// 4. useCreateResource
export function useCreateResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateResourceBody) => createResource(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: resourceKeys.all });
    },
  });
}

// 5. useUpdateResource
export function useUpdateResource(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<CreateResourceBody>) => updateResource(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: resourceKeys.detail(id) });
      qc.invalidateQueries({ queryKey: resourceKeys.all });
    },
  });
}

// 6. useDeleteResource
export function useDeleteResource(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (resourceId?: string) => deleteResource(resourceId ?? id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: resourceKeys.all });
    },
  });
}

// 7. useToggleFavorite — optimistic update
export function useToggleFavorite(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (resourceId?: string) => toggleFavorite(resourceId ?? id!),
    onMutate: async (resourceId?: string) => {
      const targetId = resourceId ?? id!;
      // Cancel any outgoing fetches
      await qc.cancelQueries({ queryKey: resourceKeys.all });

      // Optimistic update in list caches
      const listQueries = qc.getQueriesData<ResourceListResponse>({
        queryKey: [...resourceKeys.all, "list"],
      });

      for (const [key, data] of listQueries) {
        if (data) {
          qc.setQueryData(key, {
            ...data,
            resources: data.resources.map((r: ResourceWithMeta) =>
              r.id === targetId ? { ...r, isFavorite: !r.isFavorite } : r
            ),
          });
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: resourceKeys.all });
    },
  });
}

// 8. useToggleArchive
export function useToggleArchive(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (resourceId?: string) => toggleArchive(resourceId ?? id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: resourceKeys.all });
    },
  });
}

// 9. useImportUrl
export function useImportUrl() {
  return useMutation({
    mutationFn: (body: ImportUrlBody) => importUrl(body),
  });
}

// 10. useUploadFile
export function useUploadFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadFile(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: resourceKeys.all });
    },
  });
}

// 11. useToggleFeatured
export function useToggleFeatured(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => toggleFeatured(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: resourceKeys.all });
      qc.invalidateQueries({ queryKey: resourceKeys.featured() });
    },
  });
}
