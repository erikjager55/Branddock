import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  startScan,
  pollScanProgress,
  cancelScan,
  applyResults,
} from '../api/website-scanner.api';
import type {
  ScanProgressResponse,
  ApplyBody,
} from '../types/website-scanner.types';

export const websiteScannerKeys = {
  all: ['website-scanner'] as const,
  scan: (jobId: string) => [...websiteScannerKeys.all, 'scan', jobId] as const,
};

/** Poll scan progress every 2 seconds while scan is active */
export function useScanProgress(jobId: string | null) {
  return useQuery({
    queryKey: websiteScannerKeys.scan(jobId ?? ''),
    queryFn: () => pollScanProgress(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data as ScanProgressResponse | undefined;
      if (!data) return 2000;
      const done =
        data.status === 'COMPLETED' ||
        data.status === 'FAILED' ||
        data.status === 'CANCELLED';
      return done ? false : 2000;
    },
    staleTime: 0,
  });
}

/** Start a scan */
export function useStartScan() {
  return useMutation({
    mutationFn: (url: string) => startScan(url),
  });
}

/** Cancel a running scan */
export function useCancelScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => cancelScan(jobId),
    onSuccess: (_data, jobId) => {
      qc.invalidateQueries({ queryKey: websiteScannerKeys.scan(jobId) });
    },
  });
}

/** Apply scan results to workspace */
export function useApplyResults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, body }: { jobId: string; body: ApplyBody }) =>
      applyResults(jobId, body),
    onSuccess: () => {
      // Invalidate all module caches since data has been applied
      qc.invalidateQueries();
    },
  });
}
