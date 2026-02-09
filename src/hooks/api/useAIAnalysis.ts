"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type {
  StartAnalysisInput,
  UpdateAnalysisInput,
} from "@/lib/validations/ai-analysis";

export interface AIAnalysis {
  id: string;
  type: "BRAND_ANALYSIS" | "PERSONA_ANALYSIS";
  status: "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
  progress: number;
  dataPoints: number;
  duration: number | null;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  executiveSummary: string | null;
  keyFindings: unknown[] | null;
  recommendations: unknown[] | null;
  dimensions: unknown[] | null;
  confidenceBoost: number | null;
  assetId: string | null;
  personaId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export function useAssetAnalyses(assetId: string) {
  return useQuery({
    queryKey: ["knowledge", "ai-analysis", "asset", assetId],
    queryFn: () =>
      api.get<AIAnalysis[]>(`/api/assets/${assetId}/ai-analysis`),
    enabled: !!assetId,
  });
}

export function usePersonaAnalyses(personaId: string) {
  return useQuery({
    queryKey: ["knowledge", "ai-analysis", "persona", personaId],
    queryFn: () =>
      api.get<AIAnalysis[]>(`/api/personas/${personaId}/ai-analysis`),
    enabled: !!personaId,
  });
}

export function useAnalysis(analysisId: string) {
  return useQuery({
    queryKey: ["knowledge", "ai-analysis", analysisId],
    queryFn: () => api.get<AIAnalysis>(`/api/ai-analysis/${analysisId}`),
    enabled: !!analysisId,
  });
}

export function useStartAssetAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assetId,
      ...data
    }: { assetId: string } & StartAnalysisInput) =>
      api.post<AIAnalysis>(`/api/assets/${assetId}/ai-analysis`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "ai-analysis", "asset", variables.assetId],
      });
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "assets"],
      });
    },
  });
}

export function useStartPersonaAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      personaId,
      ...data
    }: { personaId: string } & StartAnalysisInput) =>
      api.post<AIAnalysis>(`/api/personas/${personaId}/ai-analysis`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "ai-analysis", "persona", variables.personaId],
      });
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "personas"],
      });
    },
  });
}

export function useUpdateAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      analysisId,
      ...data
    }: { analysisId: string } & UpdateAnalysisInput) =>
      api.patch<AIAnalysis>(`/api/ai-analysis/${analysisId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "ai-analysis"],
      });
    },
  });
}
