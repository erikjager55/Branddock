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
  updateDesignLanguageSection,
  saveForAi,
  addColor,
  deleteColor,
  fetchAiContext,
  fetchFonts,
  uploadFont,
  updateFont,
  deleteFont,
  fetchLogos,
  uploadLogo,
  updateLogo,
  deleteLogo,
  updateReview,
  uploadReviewReference,
  setPublished,
  finalizeReview,
  updateComponent,
  deleteComponent,
} from "../api/brandstyle.api";
import type { SaveForAiSection, UpdateFontBody, UpdateLogoBody, UpdateReviewBody, UpdateComponentBody } from "../types/brandstyle.types";

// Query keys
export const brandstyleKeys = {
  all: ["brandstyle"] as const,
  styleguide: () => ["brandstyle", "guide"] as const,
  section: (s: string) => ["brandstyle", "section", s] as const,
  analysisStatus: (jobId: string) => ["brandstyle", "analysis", jobId] as const,
  aiContext: () => ["brandstyle", "ai-context"] as const,
  fonts: () => ["brandstyle", "fonts"] as const,
  logos: () => ["brandstyle", "logos"] as const,
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
    "design-language": updateDesignLanguageSection,
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

// === Brand Assets — Fonts (Fase 1) ===

export function useFonts() {
  return useQuery({ queryKey: brandstyleKeys.fonts(), queryFn: fetchFonts });
}

export function useUploadFont() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uploadFont,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: brandstyleKeys.fonts() });
      qc.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
    },
  });
}

export function useUpdateFont() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateFontBody }) => updateFont(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: brandstyleKeys.fonts() });
      qc.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
    },
  });
}

export function useDeleteFont() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFont(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: brandstyleKeys.fonts() });
      qc.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
    },
  });
}

// === Brand Assets — Logos (Fase 1) ===

export function useLogos() {
  return useQuery({ queryKey: brandstyleKeys.logos(), queryFn: fetchLogos });
}

export function useUploadLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uploadLogo,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: brandstyleKeys.logos() });
      qc.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
    },
  });
}

export function useUpdateLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLogoBody }) => updateLogo(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: brandstyleKeys.logos() });
      qc.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
    },
  });
}

export function useDeleteLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLogo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: brandstyleKeys.logos() });
      qc.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
    },
  });
}

// === Review workflow + Published toggle (Fase 2) ===

export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ section, body }: { section: string; body: UpdateReviewBody }) =>
      updateReview(section, body),
    // Optimistic update so the progress bar moves the instant the user
    // clicks "Looks good" / "Needs work" — waiting for the PATCH round-trip
    // + full styleguide refetch made the UI feel dead.
    onMutate: async ({ section, body }) => {
      await qc.cancelQueries({ queryKey: brandstyleKeys.styleguide() });
      const previous = qc.getQueryData<{
        styleguide: { reviews?: Array<Record<string, unknown>> } | null;
      }>(brandstyleKeys.styleguide());
      qc.setQueryData<{
        styleguide: { reviews?: Array<Record<string, unknown>> } | null;
      }>(brandstyleKeys.styleguide(), (old) => {
        if (!old?.styleguide) return old;
        const reviews = old.styleguide.reviews ?? [];
        const existing = reviews.find((r) => r.section === section);
        const patched: Record<string, unknown> = existing
          ? { ...existing, status: body.status, feedback: body.feedback ?? null, referenceImageUrl: body.referenceImageUrl ?? null }
          : {
              id: `optimistic-${section}`,
              section,
              status: body.status,
              feedback: body.feedback ?? null,
              referenceImageUrl: body.referenceImageUrl ?? null,
              reviewedById: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
        const nextReviews = existing
          ? reviews.map((r) => (r.section === section ? patched : r))
          : [...reviews, patched];
        return {
          ...old,
          styleguide: { ...old.styleguide, reviews: nextReviews },
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(brandstyleKeys.styleguide(), context.previous);
      }
    },
    onSettled: () => {
      // Re-fetch so any server-side derived state (e.g. auto-unpublish when
      // a section drops out of APPROVED) lands in the cache authoritatively.
      qc.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
    },
  });
}

export function useUploadReviewReference() {
  return useMutation({
    mutationFn: ({ section, file }: { section: string; file: File }) =>
      uploadReviewReference(section, file),
  });
}

export function useSetPublished() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (published: boolean) => setPublished(published),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
    },
  });
}

export function useFinalizeReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => finalizeReview(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
    },
  });
}

// === Components (Fase 5) ===

export function useUpdateComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateComponentBody }) =>
      updateComponent(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
    },
  });
}

export function useDeleteComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteComponent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
    },
  });
}

