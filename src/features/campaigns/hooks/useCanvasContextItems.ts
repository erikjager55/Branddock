import { useQuery } from '@tanstack/react-query';
import type { ContextGroup } from '@/lib/ai/context/fetcher';

interface ContextItemsResponse {
  groups: ContextGroup[];
}

async function fetchContextItems(workspaceId: string): Promise<ContextItemsResponse> {
  const res = await fetch(`/api/workspaces/${workspaceId}/context-items`);
  if (!res.ok) throw new Error('Failed to fetch context items');
  return res.json();
}

export function useCanvasContextItems(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['canvas-context-items', workspaceId],
    queryFn: () => fetchContextItems(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}
