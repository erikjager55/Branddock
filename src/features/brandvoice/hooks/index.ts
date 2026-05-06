// =============================================================
// Brand Voiceguide TanStack Query hooks
// =============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchVoiceguide,
  updateVoiceguide,
  saveSectionForAi,
  recomputeCentroid,
  migrateFromPersonality,
  startVoiceAnalyze,
  fetchVoiceAnalyzeStatus,
} from "../api/voiceguide.api";
import type {
  UpdateBrandVoiceguideBody,
  SaveForAiSection,
} from "../types/voiceguide.types";

export const voiceguideKeys = {
  all: ["voiceguide"] as const,
  detail: () => [...voiceguideKeys.all, "detail"] as const,
  analysisStatus: (jobId: string) => [...voiceguideKeys.all, "analysis", jobId] as const,
};

// ─── Queries ────────────────────────────────────────────────

export function useVoiceguide() {
  return useQuery({
    queryKey: voiceguideKeys.detail(),
    queryFn: fetchVoiceguide,
    staleTime: 60_000,
  });
}

export function useVoiceAnalysisStatus(jobId: string | null) {
  return useQuery({
    queryKey: voiceguideKeys.analysisStatus(jobId ?? "none"),
    queryFn: () => fetchVoiceAnalyzeStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) return 1500;
      if (data.status === "COMPLETED" || data.status === "FAILED") return false;
      return 1500;
    },
  });
}

// ─── Mutations ──────────────────────────────────────────────

export function useUpdateVoiceguide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateBrandVoiceguideBody) => updateVoiceguide(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: voiceguideKeys.all });
    },
  });
}

export function useSaveSectionForAi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ section, value }: { section: SaveForAiSection; value?: boolean }) =>
      saveSectionForAi(section, value ?? true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: voiceguideKeys.all });
    },
  });
}

export function useRecomputeCentroid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: recomputeCentroid,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: voiceguideKeys.all });
    },
  });
}

export function useMigrateFromPersonality() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (computeCentroid?: boolean) => migrateFromPersonality(computeCentroid ?? true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: voiceguideKeys.all });
    },
  });
}

export function useStartVoiceAnalyze() {
  return useMutation({
    mutationFn: (payload: { url?: string; pastedSamples?: string[] }) => startVoiceAnalyze(payload),
  });
}
