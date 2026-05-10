// ============================================================
// useInternalFindings — TanStack hook voor Δ-1 Surface E UI.
// Wraps GET /api/alignment/internal-findings/[fidelityScoreId].
// Mirror van useReviewFindings (Surface C) maar via XOR-pad:
// findings via fidelityScoreId i.p.v. contentReviewLogId.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import type { ReviewFinding } from './useReviewContent';

export interface InternalFindingsResponse {
  fidelityScoreId: string;
  compositeScore: number;
  thresholdMet: boolean;
  scorerVersion: string | null;
  contentVersionId: string;
  deliverableId: string;
  deliverableTitle: string;
  findingsCount: number;
  findings: ReviewFinding[];
}

interface ErrorBody {
  error?: string;
  message?: string;
}

async function fetchInternalFindings(
  fidelityScoreId: string,
): Promise<InternalFindingsResponse> {
  const res = await fetch(
    `/api/alignment/internal-findings/${encodeURIComponent(fidelityScoreId)}`,
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ErrorBody;
    throw new Error(
      body.error ?? `Failed to fetch internal findings (HTTP ${res.status})`,
    );
  }
  return res.json();
}

/**
 * Query hook die findings ophaalt voor een specifieke ContentFidelityScore.
 * `enabled: false` zolang er geen score-id beschikbaar is (deliverable nog
 * niet gegenereerd / score-write nog onderweg).
 * `staleTime: Infinity` — fidelity-scores zijn immutable per ADR-2 (each
 * generate spawns a new ContentFidelityScore row), dus cache mag eeuwig
 * leven binnen de sessie.
 */
export function useInternalFindings(fidelityScoreId: string | null) {
  return useQuery({
    queryKey: ['internal-findings', fidelityScoreId],
    // Runtime guard naast `enabled`-gate. `enabled: false` voorkomt initial
    // fetch maar niet een programmatic `refetch()`-call, dus het throw-pad
    // is geen dead code — het is defense-in-depth tegen toekomstige callers.
    queryFn: () => {
      if (!fidelityScoreId) throw new Error('fidelityScoreId required');
      return fetchInternalFindings(fidelityScoreId);
    },
    enabled: fidelityScoreId !== null,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}
