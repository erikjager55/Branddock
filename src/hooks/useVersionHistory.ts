import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { VersionedResourceType, VersionChangeType } from '@prisma/client';

export interface VersionSummary {
  id: string;
  version: number;
  label: string | null;
  changeNote: string | null;
  changeType: VersionChangeType;
  diff: Record<string, { from: unknown; to: unknown }> | null;
  createdAt: string;
  createdBy: { id: string; name: string | null } | null;
}

export const versionKeys = {
  all: ['versions'] as const,
  list: (type: VersionedResourceType, resourceId: string) =>
    ['versions', type, resourceId] as const,
};

async function fetchVersions(
  type: VersionedResourceType,
  resourceId: string
): Promise<VersionSummary[]> {
  const res = await fetch(
    `/api/versions?type=${type}&resourceId=${resourceId}`
  );
  if (!res.ok) throw new Error('Failed to fetch versions');
  const data = await res.json();
  return data.versions;
}

async function restoreVersionApi(versionId: string) {
  const res = await fetch(`/api/versions/${versionId}/restore`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to restore version');
  return res.json();
}

async function createVersionApi(body: {
  resourceType: VersionedResourceType;
  resourceId: string;
  changeType?: VersionChangeType;
  changeNote?: string;
  label?: string;
}) {
  const res = await fetch('/api/versions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create version');
  return res.json();
}

/** Fetch version history for a resource */
export function useVersionHistory(
  resourceType: VersionedResourceType,
  resourceId: string | undefined
) {
  return useQuery<VersionSummary[]>({
    queryKey: versionKeys.list(resourceType, resourceId ?? ''),
    queryFn: () => fetchVersions(resourceType, resourceId!),
    enabled: !!resourceId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: false,
  });
}

/** Restore a resource to a previous version */
export function useRestoreVersion(
  resourceType: VersionedResourceType,
  resourceId: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => restoreVersionApi(versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: versionKeys.list(resourceType, resourceId),
      });
    },
  });
}

/** Create a manual snapshot */
export function useCreateVersion(
  resourceType: VersionedResourceType,
  resourceId: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (opts?: { changeNote?: string; label?: string }) =>
      createVersionApi({
        resourceType,
        resourceId,
        changeType: 'MANUAL_SAVE',
        ...opts,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: versionKeys.list(resourceType, resourceId),
      });
    },
  });
}
