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
  fetchSources,
  fetchSourceById,
  createSource,
  updateSource,
  deleteSource,
  toggleSourcePause,
  startScan,
  fetchScanProgress,
  cancelScan,
} from '../api/trend-radar.api';
import type {
  TrendListParams,
  SourceListParams,
  UpdateTrendBody,
  CreateManualTrendBody,
  CreateSourceBody,
  UpdateSourceBody,
  TrendListResponse,
  SourceListResponse,
  TrendRadarStats,
  DetectedTrendWithMeta,
  TrendSourceWithMeta,
  ScanProgressResponse,
} from '../types/trend-radar.types';
import { CACHE_TTL, GC_TIME } from '@/lib/api/cache-keys';

// ─── Query Key Factory ───────────────────────────────────────

export const trendRadarKeys = {
  all: ['trend-radar'] as const,
  trends: () => [...trendRadarKeys.all, 'trends'] as const,
  trendList: (params?: TrendListParams) => [...trendRadarKeys.trends(), params ?? {}] as const,
  trendDetail: (id: string) => [...trendRadarKeys.trends(), 'detail', id] as const,
  stats: () => [...trendRadarKeys.all, 'stats'] as const,
  sources: () => [...trendRadarKeys.all, 'sources'] as const,
  sourceList: (params?: SourceListParams) => [...trendRadarKeys.sources(), params ?? {}] as const,
  sourceDetail: (id: string) => [...trendRadarKeys.sources(), 'detail', id] as const,
  scan: (jobId: string) => [...trendRadarKeys.all, 'scan', jobId] as const,
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

// ─── Sources ─────────────────────────────────────────────────

export function useSources(
  params?: SourceListParams,
  options?: Partial<UseQueryOptions<SourceListResponse>>,
) {
  return useQuery({
    queryKey: trendRadarKeys.sourceList(params),
    queryFn: () => fetchSources(params),
    staleTime: CACHE_TTL.OVERVIEW,
    gcTime: GC_TIME.DETAIL,
    ...options,
  });
}

export function useSourceDetail(
  id: string | null,
  options?: Partial<UseQueryOptions<TrendSourceWithMeta>>,
) {
  return useQuery({
    queryKey: trendRadarKeys.sourceDetail(id ?? ''),
    queryFn: () => fetchSourceById(id!),
    enabled: !!id,
    staleTime: CACHE_TTL.DETAIL,
    gcTime: GC_TIME.DETAIL,
    ...options,
  });
}

export function useCreateSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSourceBody) => createSource(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trendRadarKeys.sources() });
      qc.invalidateQueries({ queryKey: trendRadarKeys.stats() });
    },
  });
}

export function useUpdateSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSourceBody }) => updateSource(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: trendRadarKeys.sources() });
      qc.invalidateQueries({ queryKey: trendRadarKeys.sourceDetail(vars.id) });
    },
  });
}

export function useDeleteSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSource(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trendRadarKeys.sources() });
      qc.invalidateQueries({ queryKey: trendRadarKeys.stats() });
    },
  });
}

export function useToggleSourcePause() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleSourcePause(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: trendRadarKeys.sources() });
      qc.invalidateQueries({ queryKey: trendRadarKeys.sourceDetail(id) });
      qc.invalidateQueries({ queryKey: trendRadarKeys.stats() });
    },
  });
}

// ─── Scan ────────────────────────────────────────────────────

export function useStartScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceId?: string) => startScan(sourceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trendRadarKeys.sources() });
    },
  });
}

export function useScanProgress(
  jobId: string | null,
  options?: Partial<UseQueryOptions<ScanProgressResponse>>,
) {
  return useQuery({
    queryKey: trendRadarKeys.scan(jobId ?? ''),
    queryFn: () => fetchScanProgress(jobId!),
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

export function useCancelScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => cancelScan(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trendRadarKeys.all });
    },
  });
}
