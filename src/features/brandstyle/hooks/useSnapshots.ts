"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { brandstyleKeys } from "./useBrandstyleHooks";
import type { SnapshotSummary, SnapshotDetail } from "@/lib/brandstyle/snapshots/types";
import type { SnapshotDiff } from "@/lib/brandstyle/snapshots/snapshot-diff";

export const snapshotKeys = {
  all: [...brandstyleKeys.all, 'snapshots'] as const,
  list: () => [...snapshotKeys.all, 'list'] as const,
  detail: (id: string) => [...snapshotKeys.all, 'detail', id] as const,
  diff: (fromId: string, toId: string) => [...snapshotKeys.all, 'diff', fromId, toId] as const,
};

export function useSnapshots() {
  return useQuery<{ snapshots: SnapshotSummary[] }>({
    queryKey: snapshotKeys.list(),
    queryFn: async () => {
      const res = await fetch('/api/brandstyle/snapshots');
      if (!res.ok) throw new Error('Failed to fetch snapshots');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useSnapshotDetail(id: string | null) {
  return useQuery<{ snapshot: SnapshotDetail }>({
    queryKey: snapshotKeys.detail(id ?? ''),
    queryFn: async () => {
      const res = await fetch(`/api/brandstyle/snapshots/${id}`);
      if (!res.ok) throw new Error('Failed to fetch snapshot detail');
      return res.json();
    },
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export interface SnapshotDiffResponse {
  from: { id: string; capturedAt: string };
  to: { id: string; capturedAt: string };
  diff: SnapshotDiff;
  summary: string[];
  shortSummary: string;
}

export function useSnapshotDiff(
  fromId: string | null,
  toId: string | null,
  options: { includeCosmetic?: boolean } = {},
) {
  return useQuery<SnapshotDiffResponse>({
    queryKey: [...snapshotKeys.diff(fromId ?? '', toId ?? ''), options.includeCosmetic ?? false],
    queryFn: async () => {
      const params = options.includeCosmetic ? '?includeCosmetic=true' : '';
      const res = await fetch(`/api/brandstyle/snapshots/${fromId}/diff/${toId}${params}`);
      if (!res.ok) throw new Error('Failed to fetch diff');
      return res.json();
    },
    enabled: Boolean(fromId && toId && fromId !== toId),
    staleTime: 60_000,
  });
}

export function useUpdateSnapshotNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string | null }) => {
      const res = await fetch(`/api/brandstyle/snapshots/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error('Failed to update notes');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.all });
    },
  });
}
