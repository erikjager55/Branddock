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
import { useWorkspace } from "@/hooks/use-workspace";

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
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (body: UpdateBrandVoiceguideBody) => updateVoiceguide(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: voiceguideKeys.all });
      // suggested-locale endpoint returnt ook `activeLocale` (resolved
      // via voiceguide.contentLocale → workspace.contentLanguage), dus
      // moet refetchen wanneer de voiceguide muteert. Skip wanneer
      // workspaceId nog niet resolved is — de suggested-locale query
      // is dan ook nog niet gevuld (gated by `enabled: !!workspaceId`).
      if (workspaceId) {
        qc.invalidateQueries({ queryKey: ['suggested-locale', workspaceId] });
      }
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
