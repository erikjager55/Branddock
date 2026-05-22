'use client';

// =============================================================
// useAdQualityScore — TanStack Query hook per spec sectie 7.3
//
// staleTime: 5 min (content rarely changes within that window).
// Caller is verantwoordelijk voor invalidation bij content-regenerate
// (via queryClient.invalidateQueries(['ad-quality', deliverableId])).
//
// Fire-and-forget trigger via triggerAdQualityScore(deliverableId,
// variantIndex) — POST naar API, geen TanStack mutation (we leveren
// alleen het GET-pad als query, mutations zijn caller's verantwoor-
// delijkheid om de query te invalidaten daarna).
// =============================================================

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AdQualityScore } from '@prisma/client';

const STALE_TIME_MS = 5 * 60 * 1000; // 5 min

interface AdQualityScoresResponse {
  scores: AdQualityScore[];
}

async function fetchAdQualityScores(deliverableId: string): Promise<AdQualityScoresResponse> {
  const res = await fetch(`/api/deliverables/${deliverableId}/ad-quality`);
  if (!res.ok) {
    if (res.status === 404) return { scores: [] };
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body.error ?? `Failed to fetch ad-quality scores (${res.status})`);
  }
  return res.json();
}

/**
 * Returns latest AdQualityScore for the given variantIndex, or null if
 * no score has been generated yet. UI surfaces a skeleton in the null
 * case if generation is still pending.
 */
export function useAdQualityScore(
  deliverableId: string,
  variantIndex: number,
): UseQueryResult<AdQualityScore | null> {
  return useQuery({
    queryKey: ['ad-quality', deliverableId],
    queryFn: () => fetchAdQualityScores(deliverableId),
    staleTime: STALE_TIME_MS,
    select: (data) =>
      data.scores.find((s) => s.variantIndex === variantIndex) ?? null,
  });
}

/**
 * Fire-and-forget trigger. Caller invalidates the query when done.
 * Errors are surfaced to the caller — caller decides whether to retry
 * or surface to UI.
 */
export async function triggerAdQualityScore(
  deliverableId: string,
  variantIndex: number,
): Promise<AdQualityScore> {
  const res = await fetch(
    `/api/deliverables/${deliverableId}/ad-quality?variantIndex=${variantIndex}`,
    { method: 'POST' },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body.error ?? `Failed to trigger ad-quality score (${res.status})`);
  }
  return res.json();
}
