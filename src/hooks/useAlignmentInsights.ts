// ============================================================
// useAlignmentInsights — TanStack hook voor Brand Alignment Insights tab.
// Wraps GET /api/brand-alignment/insights met 60s staleTime (niet immutable
// want nieuwe reviews kunnen aankomen tijdens de pilot).
// ============================================================

import { useQuery } from '@tanstack/react-query';

export interface AlignmentInsightsTotals {
  totalReviews: number;
  externalReviews: number;
  internalReviews: number;
  reviewsLast7d: number;
  totalFindings: number;
  thresholdPassRate: number;
  overrideRate: number;
  blockedCount: number;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface PassRatePoint {
  date: string;
  passRate: number;
  reviewCount: number;
}

export interface RecentReview {
  id: string;
  source: 'paste' | 'url' | 'canvas';
  compositeScore: number;
  thresholdMet: boolean;
  findingsCount: number;
  scoredAt: string;
}

export interface AlignmentInsightsResponse {
  window: '30d';
  generatedAt: string;
  totals: AlignmentInsightsTotals;
  topCategories: CategoryCount[];
  passRateTrend: PassRatePoint[];
  recentReviews: RecentReview[];
}

interface ErrorBody {
  error?: string;
  message?: string;
}

async function fetchAlignmentInsights(): Promise<AlignmentInsightsResponse> {
  const res = await fetch('/api/brand-alignment/insights');
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ErrorBody;
    throw new Error(
      body.error ?? `Failed to fetch insights (HTTP ${res.status})`,
    );
  }
  return res.json();
}

/**
 * Query hook voor de Brand Alignment Insights tab.
 * `staleTime: 60_000` — niet immutable; nieuwe reviews tijdens de pilot
 * mogen binnen 1 minuut zichtbaar worden zonder handmatige refresh.
 */
export function useAlignmentInsights() {
  return useQuery({
    queryKey: ['alignment-insights'],
    queryFn: fetchAlignmentInsights,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}
