import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listContentVersions,
  getContentVersion,
  createUserContentVersion,
  restoreContentVersion,
} from '../api/content-versions.api';
import { canvasKeys } from './canvas.hooks';

export const contentVersionKeys = {
  all: ['content-versions'] as const,
  list: (deliverableId: string) => ['content-versions', deliverableId, 'list'] as const,
  detail: (deliverableId: string, versionId: string) =>
    ['content-versions', deliverableId, 'detail', versionId] as const,
};

const DISABLED_KEY = ['content-versions', '__disabled__'] as const;

/**
 * Fetch the list of versions for a deliverable.
 *
 * staleTime is 0 so the sidebar refreshes on focus/mount — important because
 * AI-versions are created server-side by generate/regenerate/generate-all
 * routes and the canvas orchestrator does not currently invalidate this
 * key client-side. Callers triggering generate from the canvas may also
 * `qc.invalidateQueries({ queryKey: contentVersionKeys.list(deliverableId) })`
 * after their mutation succeeds for instant feedback.
 */
export function useContentVersions(deliverableId: string | null) {
  return useQuery({
    queryKey: deliverableId ? contentVersionKeys.list(deliverableId) : DISABLED_KEY,
    queryFn: () => listContentVersions(deliverableId!),
    enabled: !!deliverableId,
    staleTime: 0,
  });
}

/** Fetch a single version with full snapshot + fidelity scores. Snapshots are
 * immutable — staleTime: Infinity avoids needless refetches. */
export function useContentVersion(
  deliverableId: string | null,
  versionId: string | null,
) {
  return useQuery({
    queryKey:
      deliverableId && versionId
        ? contentVersionKeys.detail(deliverableId, versionId)
        : DISABLED_KEY,
    queryFn: () => getContentVersion(deliverableId!, versionId!),
    enabled: !!deliverableId && !!versionId,
    staleTime: Infinity,
  });
}

/** Persist current deliverable state as a new USER-version (manual save). */
export function useCreateUserContentVersion(deliverableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => createUserContentVersion(deliverableId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contentVersionKeys.list(deliverableId) });
    },
  });
}

/** Restore deliverable + components to an older version's state. */
export function useRestoreContentVersion(deliverableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => restoreContentVersion(deliverableId, versionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contentVersionKeys.list(deliverableId) });
      qc.invalidateQueries({ queryKey: canvasKeys.components(deliverableId) });
    },
  });
}
