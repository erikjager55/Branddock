import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchStyleguide,
  fetchAnalysisStatus,
  analyzeUrl,
  analyzePdf,
  updateLogoSection,
  updateColorsSection,
  updateTypographySection,
  updateToneOfVoiceSection,
  updateImagerySection,
  saveForAi,
  addColor,
  deleteColor,
  exportPdf,
  fetchAiContext,
} from "../api/brandstyle.api";
import type { SaveForAiSection } from "../types/brandstyle.types";

// Query keys
export const brandstyleKeys = {
  all: ["brandstyle"] as const,
  styleguide: () => ["brandstyle", "guide"] as const,
  section: (s: string) => ["brandstyle", "section", s] as const,
  analysisStatus: (jobId: string) => ["brandstyle", "analysis", jobId] as const,
  aiContext: () => ["brandstyle", "ai-context"] as const,
};

// === Queries ===

export function useStyleguide() {
  return useQuery({
    queryKey: brandstyleKeys.styleguide(),
    queryFn: fetchStyleguide,
  });
}

export function useAnalysisStatus(jobId: string | null) {
  return useQuery({
    queryKey: brandstyleKeys.analysisStatus(jobId ?? ""),
    queryFn: () => fetchAnalysisStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.status === "COMPLETE" || data.status === "ERROR") return false;
      return 2000;
    },
  });
}

export function useAiContext() {
  return useQuery({
    queryKey: brandstyleKeys.aiContext(),
    queryFn: fetchAiContext,
  });
}

// === Mutations ===

export function useAnalyzeUrl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => analyzeUrl(url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
    },
  });
}

export function useAnalyzePdf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => analyzePdf(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
    },
  });
}

export function useUpdateSection(section: string) {
  const queryClient = useQueryClient();

  const updateFns: Record<string, (data: Record<string, unknown>) => Promise<unknown>> = {
    logo: updateLogoSection,
    colors: updateColorsSection,
    typography: updateTypographySection,
    "tone-of-voice": updateToneOfVoiceSection,
    imagery: updateImagerySection,
  };

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      const fn = updateFns[section];
      if (!fn) throw new Error(`Unknown section: ${section}`);
      return fn(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
      queryClient.invalidateQueries({ queryKey: brandstyleKeys.section(section) });
    },
  });
}

export function useSaveForAi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (section: SaveForAiSection) => saveForAi(section),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
      queryClient.invalidateQueries({ queryKey: brandstyleKeys.aiContext() });
    },
  });
}

export function useAddColor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addColor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
      queryClient.invalidateQueries({ queryKey: brandstyleKeys.section("colors") });
    },
  });
}

export function useDeleteColor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (colorId: string) => deleteColor(colorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
      queryClient.invalidateQueries({ queryKey: brandstyleKeys.section("colors") });
    },
  });
}

export function useExportPdf() {
  return useMutation({
    mutationFn: exportPdf,
  });
}
