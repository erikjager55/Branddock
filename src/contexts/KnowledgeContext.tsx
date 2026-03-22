import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Knowledge, Collection, KnowledgeWithMeta } from '../types/knowledge';
import { apiKnowledgeToMockFormatList } from '../lib/api/knowledge-adapter';
import {
  fetchFeaturedResources,
  toggleFavorite,
  toggleArchive,
  toggleFeatured,
} from '../lib/api/knowledge';
import { useWorkspace } from '../hooks/use-workspace';

interface KnowledgeContextType {
  knowledge: Knowledge[];
  collections: Collection[];
  addKnowledge: (item: Knowledge) => void;
  updateKnowledge: (id: string, item: Knowledge) => void;
  deleteKnowledge: (id: string) => void;
  getKnowledge: (id: string) => Knowledge | undefined;
  isLoading: boolean;
}

const KnowledgeContext = createContext<KnowledgeContextType | undefined>(undefined);

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const { workspaceId, isLoading: wsLoading } = useWorkspace();
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (wsLoading) return;

    if (!workspaceId) {
      setIsLoading(false);
      return;
    }

    fetch('/api/knowledge')
      .then(res => res.json())
      .then(data => {
        if (data.resources && data.resources.length > 0) {
          setKnowledge(apiKnowledgeToMockFormatList(data.resources) as unknown as Knowledge[]);
        }
      })
      .catch(err => {
        console.warn('[KnowledgeContext] API fetch failed:', err.message);
      })
      .finally(() => setIsLoading(false));
  }, [workspaceId, wsLoading]);

  const addKnowledge = (item: Knowledge) => setKnowledge(prev => [...prev, item]);
  const updateKnowledge = (id: string, item: Knowledge) =>
    setKnowledge(prev => prev.map(k => (k.id === id ? item : k)));
  const deleteKnowledge = (id: string) => setKnowledge(prev => prev.filter(k => k.id !== id));
  const getKnowledge = (id: string) => knowledge.find(k => k.id === id);

  return (
    <KnowledgeContext.Provider value={{ knowledge, collections, addKnowledge, updateKnowledge, deleteKnowledge, getKnowledge, isLoading }}>
      {children}
    </KnowledgeContext.Provider>
  );
}

export function useKnowledgeContext() {
  const context = useContext(KnowledgeContext);
  if (!context) {
    throw new Error('useKnowledgeContext must be used within a KnowledgeProvider');
  }
  return context;
}

// =============================================================
// TanStack Query hooks for Knowledge extensions
// =============================================================

const knowledgeKeys = {
  all: ['knowledge'] as const,
  featured: (workspaceId: string) => ['knowledge', 'featured', workspaceId] as const,
};

/**
 * Hook: fetch featured resources.
 */
export function useFeaturedResources() {
  const { workspaceId } = useWorkspace();
  return useQuery<{ resources: KnowledgeWithMeta[] }>({
    queryKey: knowledgeKeys.featured(workspaceId ?? ''),
    queryFn: fetchFeaturedResources,
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

/**
 * Mutation: toggle isFavorite with optimistic update.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleFavorite(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: knowledgeKeys.all });

      // Snapshot for rollback (featured query)
      const previousFeatured = queryClient.getQueriesData({ queryKey: knowledgeKeys.all });

      // Optimistic update on featured resources cache
      queryClient.setQueriesData<{ resources: KnowledgeWithMeta[] }>(
        { queryKey: ['knowledge', 'featured'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            resources: old.resources.map((r) =>
              r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
            ),
          };
        }
      );

      return { previousFeatured };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousFeatured) {
        for (const [key, data] of context.previousFeatured) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.all });
    },
  });
}

/**
 * Mutation: toggle isArchived.
 */
export function useToggleArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleArchive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.all });
    },
  });
}

/**
 * Mutation: toggle isFeatured.
 */
export function useToggleFeatured() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleFeatured(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.all });
    },
  });
}
