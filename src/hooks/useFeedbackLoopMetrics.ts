// =============================================================
// useFeedbackLoopMetrics — TanStack hook voor Brand Alignment Insights
// tab Δ-3 panels (content-test #6.B). Wraps
// GET /api/brand-alignment/feedback-loop-metrics met 5min staleTime.
// =============================================================

import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from './use-workspace';

export interface AutoIterateMetrics {
  totalRuns: number;
  successCount: number;
  exhaustedCount: number;
  avgIterations: number;
  avgScoreImprovement: number;
}

export interface TemplateEffectivenessRow {
  templateId: string;
  appliedCount: number;
  avgScoreImprovement: number;
}

export interface EditDistanceRow {
  componentType: string;
  totalEdits: number;
  significantEdits: number;
  avgDistance: number;
}

export interface FeedbackLoopMetricsResponse {
  window: '30d';
  generatedAt: string;
  autoIterate: AutoIterateMetrics;
  templates: TemplateEffectivenessRow[];
  editDistance: EditDistanceRow[];
}

async function fetchFeedbackLoopMetrics(): Promise<FeedbackLoopMetricsResponse> {
  const res = await fetch('/api/brand-alignment/feedback-loop-metrics');
  if (!res.ok) {
    throw new Error(`Failed to fetch feedback-loop metrics (HTTP ${res.status})`);
  }
  return res.json();
}

export function useFeedbackLoopMetrics() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ['feedback-loop-metrics', workspaceId],
    queryFn: fetchFeedbackLoopMetrics,
    enabled: !!workspaceId,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
  });
}
