import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────

export interface ItemKnowledgeSource {
  id: string;
  itemType: string;
  itemId: string;
  title: string;
  sourceType: 'text' | 'url' | 'file';
  description: string | null;
  content: string | null;
  url: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  filePath: string | null;
  isProcessed: boolean;
  processingError: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Query Key Factory ────────────────────────────────────────

export const itemKnowledgeKeys = {
  all: ['item-knowledge-sources'] as const,
  list: (itemType: string, itemId: string) =>
    ['item-knowledge-sources', 'list', itemType, itemId] as const,
};

// ─── API Functions ────────────────────────────────────────────

async function fetchItemKnowledgeSources(itemType: string, itemId: string): Promise<ItemKnowledgeSource[]> {
  const res = await fetch(`/api/items/${itemType}/${itemId}/knowledge-sources`);
  if (!res.ok) throw new Error('Failed to fetch knowledge sources');
  const data = await res.json();
  return data.sources;
}

async function createTextSource(itemType: string, itemId: string, body: {
  title: string;
  description?: string;
  content: string;
}): Promise<ItemKnowledgeSource> {
  const res = await fetch(`/api/items/${itemType}/${itemId}/knowledge-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, sourceType: 'text' }),
  });
  if (!res.ok) throw new Error('Failed to create text source');
  const data = await res.json();
  return data.source;
}

async function createUrlSource(itemType: string, itemId: string, body: {
  title: string;
  description?: string;
  url: string;
}): Promise<ItemKnowledgeSource> {
  const res = await fetch(`/api/items/${itemType}/${itemId}/knowledge-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, sourceType: 'url' }),
  });
  if (!res.ok) throw new Error('Failed to create URL source');
  const data = await res.json();
  return data.source;
}

async function uploadFileSource(itemType: string, itemId: string, formData: FormData): Promise<ItemKnowledgeSource> {
  const res = await fetch(`/api/items/${itemType}/${itemId}/knowledge-sources/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload file source');
  const data = await res.json();
  return data.source;
}

async function deleteKnowledgeSource(itemType: string, itemId: string, sourceId: string): Promise<void> {
  const res = await fetch(`/api/items/${itemType}/${itemId}/knowledge-sources/${sourceId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete knowledge source');
}

// ─── Hooks ────────────────────────────────────────────────────

/** Fetch all knowledge sources for an item */
export function useItemKnowledgeSources(itemType: string, itemId: string) {
  return useQuery<ItemKnowledgeSource[]>({
    queryKey: itemKnowledgeKeys.list(itemType, itemId),
    queryFn: () => fetchItemKnowledgeSources(itemType, itemId),
    enabled: !!itemType && !!itemId,
    staleTime: 30_000,
  });
}

/** Create a text knowledge source */
export function useCreateTextSource(itemType: string, itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; description?: string; content: string }) =>
      createTextSource(itemType, itemId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: itemKnowledgeKeys.list(itemType, itemId) });
    },
  });
}

/** Create a URL knowledge source */
export function useCreateUrlSource(itemType: string, itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; description?: string; url: string }) =>
      createUrlSource(itemType, itemId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: itemKnowledgeKeys.list(itemType, itemId) });
    },
  });
}

/** Upload a file knowledge source */
export function useUploadFileSource(itemType: string, itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      uploadFileSource(itemType, itemId, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: itemKnowledgeKeys.list(itemType, itemId) });
    },
  });
}

/** Delete a knowledge source */
export function useDeleteKnowledgeSource(itemType: string, itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) =>
      deleteKnowledgeSource(itemType, itemId, sourceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: itemKnowledgeKeys.list(itemType, itemId) });
    },
  });
}
