"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export interface StyleguideLogoData {
  id: string;
  variant: string;
  label: string;
  description: string | null;
  imageUrl: string | null;
  backgroundColor: string | null;
  sortOrder: number;
}

export interface StyleguideColorData {
  id: string;
  name: string;
  hex: string;
  rgb: string | null;
  hsl: string | null;
  cmyk: string | null;
  tags: string[] | null;
  category: string;
  notes: string | null;
  sortOrder: number;
}

export interface TypeScaleItem {
  level: string;
  size: string;
  weight: string;
  lineHeight: string;
  preview: string;
}

export interface ExamplePhrase {
  text: string;
  type: "DO" | "DONT";
}

export interface BrandStyleguideData {
  id: string;
  name: string;
  sourceType: string;
  sourceUrl: string | null;
  sourceFileName: string | null;
  status: string;
  logos: StyleguideLogoData[];
  colors: StyleguideColorData[];
  primaryFont: string | null;
  secondaryFont: string | null;
  typeScale: TypeScaleItem[] | null;
  contentGuidelines: string[] | null;
  writingGuidelines: string[] | null;
  examplePhrases: ExamplePhrase[] | null;
  photographyGuidelines: string[] | null;
  illustrationGuidelines: string[] | null;
  imageryDonts: string[] | null;
  photographyExamples: unknown[] | null;
  logoUsageGuidelines: string[] | null;
  logoDonts: string[] | null;
  colorDonts: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export function useBrandStyleguide() {
  return useQuery({
    queryKey: ["brandstyle"],
    queryFn: () =>
      api.get<{ data: BrandStyleguideData | null }>("/api/brandstyle"),
  });
}

export function useAnalyzeBrandstyle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      sourceType: "WEBSITE" | "PDF";
      sourceUrl?: string;
      sourceFileName?: string;
    }) => api.post<{ data: { id: string; status: string } }>("/api/brandstyle/analyze", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brandstyle"] });
    },
  });
}

export function useUpdateStyleguide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.patch<{ data: BrandStyleguideData }>("/api/brandstyle", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brandstyle"] });
    },
  });
}

export function useCreateColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      hex: string;
      rgb?: string;
      hsl?: string;
      cmyk?: string;
      tags?: string[];
      category?: string;
    }) => api.post<{ data: StyleguideColorData }>("/api/brandstyle/colors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brandstyle"] });
    },
  });
}

export function useDeleteColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/brandstyle/colors?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brandstyle"] });
    },
  });
}

export function useExportPdf() {
  return useMutation({
    mutationFn: () =>
      api.post<{ data: { url: string | null; message: string } }>(
        "/api/brandstyle/export-pdf",
        {}
      ),
  });
}
