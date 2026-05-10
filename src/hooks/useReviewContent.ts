// ============================================================
// useReviewContent — TanStack hook voor Δ-1 Surface C UI.
// Wraps POST /api/alignment/review-external (mutation) en de
// vervolg-fetch GET /[reviewLogId] (query) tot één hook.
// ============================================================

import { useMutation, useQuery } from '@tanstack/react-query';
import type {
  ReviewFinding,
  ReviewSeverity,
  ReviewCategory,
} from '@/types/brand-review-finding';

// Re-export voor bestaande consumers die uit deze hook importeerden.
// Nieuwe consumers importeren liever direct uit `@/types/brand-review-finding`.
export type { ReviewFinding, ReviewSeverity, ReviewCategory };

export interface ReviewSubmitResponse {
  reviewLogId: string;
  compositeScore: number;
  thresholdMet: boolean;
  findingsCount: number;
  durationMs: number;
  scorerVersion: string | null;
}

export interface ReviewFindingsResponse {
  reviewLogId: string;
  sourceType: string;
  sourceUrl: string | null;
  compositeScore: number;
  thresholdMet: boolean;
  scorerVersion: string | null;
  durationMs: number;
  findingsCount: number;
  findings: ReviewFinding[];
}

export type ReviewSubmitInput =
  | {
      sourceType: 'paste';
      content: string;
      language?: string;
      runJudge?: boolean;
    }
  | {
      sourceType: 'url';
      url: string;
      language?: string;
      runJudge?: boolean;
    };

interface ErrorBody {
  error?: string;
  message?: string;
  code?: string;
}

async function submitReview(input: ReviewSubmitInput): Promise<ReviewSubmitResponse> {
  const res = await fetch('/api/alignment/review-external', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ErrorBody;
    throw new Error(
      body.error ?? body.message ?? `Review failed (HTTP ${res.status})`,
    );
  }
  return res.json();
}

async function fetchReviewFindings(reviewLogId: string): Promise<ReviewFindingsResponse> {
  const res = await fetch(
    `/api/alignment/review-external/${encodeURIComponent(reviewLogId)}`,
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ErrorBody;
    throw new Error(
      body.error ?? `Failed to fetch findings (HTTP ${res.status})`,
    );
  }
  return res.json();
}

/**
 * Mutation hook voor het indienen van een review (paste/url).
 * Caller chaint onSuccess naar `useReviewFindings` voor de findings-fetch.
 */
export function useSubmitReview() {
  return useMutation({
    mutationFn: submitReview,
  });
}

/**
 * Query hook die findings ophaalt voor een specifieke reviewLogId.
 * `enabled: false` totdat een reviewLogId is geleverd na succesvolle mutation.
 * `staleTime: Infinity` — review-logs zijn immutable per ADR-2, dus cache
 * mag eeuwig leven binnen de sessie.
 */
export function useReviewFindings(reviewLogId: string | null) {
  return useQuery({
    queryKey: ['review-findings', reviewLogId],
    queryFn: () => {
      if (!reviewLogId) throw new Error('reviewLogId required');
      return fetchReviewFindings(reviewLogId);
    },
    enabled: reviewLogId !== null,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}
