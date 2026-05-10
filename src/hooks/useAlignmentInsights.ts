// ============================================================
// useAlignmentInsights — TanStack hook voor Brand Alignment Insights tab.
// Wraps GET /api/brand-alignment/insights met 60s staleTime (niet immutable
// want nieuwe reviews kunnen aankomen tijdens de pilot).
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from './use-workspace';

export interface AlignmentInsightsTotals {
  totalReviews: number;
  externalReviews: number;
  internalReviews: number;
  reviewsLast7d: number;
  totalFindings: number;
  thresholdPassRate: number;
  /**
   * Proxy-rate: van de internal scores die below-threshold waren, hoeveel
   * van hun deliverables zijn ondanks dat gepubliceerd. Niet 1-op-1 met
   * "user heeft override-modal gebruikt" — een latere passing version van
   * dezelfde deliverable telt ook mee. Voor pilot-signal goed genoeg.
   */
  blockedPublishedRate: number;
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
  /**
   * True wanneer een van de DB-fetches de runaway-cap (5000) heeft geraakt
   * en de KPIs dus uit een gedeeltelijke set zijn berekend. UI moet hier
   * een waarschuwing tonen zodat de pilot-verdict niet stiekem op
   * onderschatte counts wordt gebaseerd.
   */
  truncated: boolean;
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
 *
 * `workspaceId` in de queryKey voorkomt cross-workspace cache-bleed: na
 * een workspace-switch (cookie change) wordt direct de juiste cache-bucket
 * aangesproken i.p.v. tot 60s stale data van het vorige workspace serveren.
 */
export function useAlignmentInsights() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ['alignment-insights', workspaceId],
    queryFn: fetchAlignmentInsights,
    enabled: !!workspaceId,
    staleTime: 60_000,
    // Expliciet ipv default — maakt de cache-policy zichtbaar naast de
    // bewuste staleTime keuze (default zou hetzelfde gedrag geven, maar
    // toekomstige TanStack-default-shifts moeten geen stille gevolgen hebben).
    gcTime: 5 * 60_000,
    retry: 1,
  });
}
