// =============================================================
// AI Brand Analysis — TanStack Query Hooks (S1 — Fase 1B)
// =============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  startAnalysisSession,
  getAnalysisSession,
  submitAnswer,
  completeSession,
  generateReport,
  getReport,
  toggleSessionLock,
} from "../api/ai-analysis.api";
import { brandAssetKeys } from "@/hooks/use-brand-assets";

// ─── Query Keys ─────────────────────────────────────────────

export const aiAnalysisKeys = {
  all: ["ai-analysis"] as const,
  session: (assetId: string, sessionId: string) =>
    ["ai-analysis", "session", assetId, sessionId] as const,
  report: (assetId: string, sessionId: string) =>
    ["ai-analysis", "report", assetId, sessionId] as const,
};

// ─── Get Session ────────────────────────────────────────────

export function useAIAnalysisSession(
  assetId: string | undefined,
  sessionId: string | undefined,
) {
  return useQuery({
    queryKey: aiAnalysisKeys.session(assetId ?? "", sessionId ?? ""),
    queryFn: () => getAnalysisSession(assetId!, sessionId!),
    enabled: !!assetId && !!sessionId,
    staleTime: 30_000,
  });
}

// ─── Start Session ──────────────────────────────────────────

export function useStartAnalysis(assetId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (personaId?: string) =>
      startAnalysisSession(assetId!, personaId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: aiAnalysisKeys.session(assetId!, data.sessionId),
      });
    },
  });
}

// ─── Submit Answer ──────────────────────────────────────────

export function useSendAnswer(
  assetId: string | undefined,
  sessionId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      submitAnswer(assetId!, sessionId!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aiAnalysisKeys.session(assetId!, sessionId!),
      });
    },
  });
}

// ─── Complete Session ───────────────────────────────────────

export function useCompleteAnalysis(
  assetId: string | undefined,
  sessionId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => completeSession(assetId!, sessionId!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aiAnalysisKeys.session(assetId!, sessionId!),
      });
      // Invalidate brand-assets cache (validation % changes via research method update)
      queryClient.invalidateQueries({ queryKey: brandAssetKeys.all });
      // Invalidate asset detail cache
      queryClient.invalidateQueries({ queryKey: ["brand-asset-detail", assetId!] });
    },
  });
}

// ─── Generate Report ────────────────────────────────────────

export function useGenerateReport(
  assetId: string | undefined,
  sessionId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateReport(assetId!, sessionId!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aiAnalysisKeys.report(assetId!, sessionId!),
      });
    },
  });
}

// ─── Poll Report ────────────────────────────────────────────

export function useAIAnalysisReport(
  assetId: string | undefined,
  sessionId: string | undefined,
  enabled: boolean = false,
) {
  return useQuery({
    queryKey: aiAnalysisKeys.report(assetId ?? "", sessionId ?? ""),
    queryFn: () => getReport(assetId!, sessionId!),
    enabled: !!assetId && !!sessionId && enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.ready) return false;
      return 2000; // Poll every 2s until ready
    },
  });
}

// ─── Toggle Lock ────────────────────────────────────────────

export function useToggleLock(
  assetId: string | undefined,
  sessionId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => toggleSessionLock(assetId!, sessionId!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aiAnalysisKeys.session(assetId!, sessionId!),
      });
      // Also invalidate brand assets cache (research method status may change)
      queryClient.invalidateQueries({ queryKey: brandAssetKeys.all });
    },
  });
}
