// =============================================================
// Trend Radar TanStack Query Hooks
// =============================================================

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  fetchTrends,
  fetchTrendById,
  updateTrend,
  deleteTrend,
  activateTrend,
  dismissTrend,
  createManualTrend,
  fetchTrendStats,
  startResearch,
  fetchResearchProgress,
  cancelResearch,
  approveResearchTrends,
} from '../api/trend-radar.api';
import type {
  TrendListParams,
  UpdateTrendBody,
  CreateManualTrendBody,
  TrendListResponse,
  TrendRadarStats,
  DetectedTrendWithMeta,
  ResearchProgressResponse,
  StartResearchBody,
} from '../types/trend-radar.types';
import { CACHE_TTL, GC_TIME } from '@/lib/api/cache-keys';

// ─── Query Key Factory ───────────────────────────────────────

export const trendRadarKeys = {
  all: ['trend-radar'] as const,
  trends: () => [...trendRadarKeys.all, 'trends'] as const,
  trendList: (params?: TrendListParams) => [...trendRadarKeys.trends(), params ?? {}] as const,
  trendDetail: (id: string) => [...trendRadarKeys.trends(), 'detail', id] as const,
  stats: () => [...trendRadarKeys.all, 'stats'] as const,
  research: (jobId: string) => [...trendRadarKeys.all, 'research', jobId] as const,
};

// ─── Trends ──────────────────────────────────────────────────

export function useTrends(
  params?: TrendListParams,
  options?: Partial<UseQueryOptions<TrendListResponse>>,
) {
  return useQuery({
    queryKey: trendRadarKeys.trendList(params),
    queryFn: () => fetchTrends(params),
    staleTime: CACHE_TTL.OVERVIEW,
    gcTime: GC_TIME.DETAIL,
    ...options,
  });
}

export function useTrendDetail(
  id: string | null,
  options?: Partial<UseQueryOptions<DetectedTrendWithMeta>>,
) {
  return useQuery({
    queryKey: trendRadarKeys.trendDetail(id ?? ''),
    queryFn: () => fetchTrendById(id!),
    enabled: !!id,
    staleTime: CACHE_TTL.DETAIL,
    gcTime: GC_TIME.DETAIL,
    ...options,
  });
}

export function useUpdateTrend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTrendBody }) => updateTrend(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: trendRadarKeys.trends() });
      qc.invalidateQueries({ queryKey: trendRadarKeys.trendDetail(vars.id) });
      qc.invalidateQueries({ queryKey: trendRadarKeys.stats() });
    },
  });
}

export function useDeleteTrend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTrend(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trendRadarKeys.trends() });
      qc.invalidateQueries({ queryKey: trendRadarKeys.stats() });
    },
  });
}

export function useActivateTrend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activateTrend(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: trendRadarKeys.trends() });
      qc.invalidateQueries({ queryKey: trendRadarKeys.trendDetail(id) });
      qc.invalidateQueries({ queryKey: trendRadarKeys.stats() });
    },
  });
}

export function useDismissTrend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dismissTrend(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: trendRadarKeys.trends() });
      qc.invalidateQueries({ queryKey: trendRadarKeys.trendDetail(id) });
      qc.invalidateQueries({ queryKey: trendRadarKeys.stats() });
    },
  });
}

export function useCreateManualTrend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateManualTrendBody) => createManualTrend(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trendRadarKeys.trends() });
      qc.invalidateQueries({ queryKey: trendRadarKeys.stats() });
    },
  });
}

// ─── Stats ───────────────────────────────────────────────────

export function useTrendStats(
  options?: Partial<UseQueryOptions<TrendRadarStats>>,
) {
  return useQuery({
    queryKey: trendRadarKeys.stats(),
    queryFn: fetchTrendStats,
    staleTime: CACHE_TTL.DASHBOARD,
    gcTime: GC_TIME.DETAIL,
    ...options,
  });
}

// ─── Research ────────────────────────────────────────────────

export function useStartResearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StartResearchBody) => startResearch(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trendRadarKeys.trends() });
    },
  });
}

export function useResearchProgress(
  jobId: string | null,
  options?: Partial<UseQueryOptions<ResearchProgressResponse>>,
) {
  return useQuery({
    queryKey: trendRadarKeys.research(jobId ?? ''),
    queryFn: () => fetchResearchProgress(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.status === 'RUNNING' || data.status === 'PENDING') return 2000;
      return false; // Stop polling when complete/failed/cancelled
    },
    staleTime: 0,
    gcTime: 0,
    ...options,
  });
}

export function useCancelResearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => cancelResearch(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trendRadarKeys.all });
    },
  });
}

export function useApproveResearchTrends() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, selectedIndices }: { jobId: string; selectedIndices: number[] }) =>
      approveResearchTrends(jobId, selectedIndices),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trendRadarKeys.trends() });
      qc.invalidateQueries({ queryKey: trendRadarKeys.stats() });
    },
  });
}
