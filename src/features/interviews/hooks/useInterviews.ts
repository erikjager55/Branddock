import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchInterviews,
  createInterview,
  fetchInterviewDetail,
  updateInterview,
  deleteInterview,
  duplicateInterview,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  completeInterview,
  approveInterview,
  fetchTemplates,
} from "../api/interview.api";
import { brandAssetKeys } from "@/hooks/use-brand-assets";

// ─── Query Keys ──────────────────────────────────────────────

export const interviewKeys = {
  all: ["interviews"] as const,
  byAsset: (assetId: string) => ["interviews", "asset", assetId] as const,
  detail: (id: string) => ["interviews", id] as const,
  templates: (assetId: string) =>
    ["interviews", "templates", assetId] as const,
};

// ─── List ────────────────────────────────────────────────────

export function useInterviews(assetId: string | undefined) {
  return useQuery({
    queryKey: interviewKeys.byAsset(assetId ?? ""),
    queryFn: () => fetchInterviews(assetId!),
    enabled: !!assetId,
  });
}

// ─── Detail ──────────────────────────────────────────────────

export function useInterviewDetail(
  assetId: string | undefined,
  interviewId: string | undefined,
) {
  return useQuery({
    queryKey: interviewKeys.detail(interviewId ?? ""),
    queryFn: () => fetchInterviewDetail(assetId!, interviewId!),
    enabled: !!assetId && !!interviewId,
    staleTime: 15_000,
  });
}

// ─── Create ──────────────────────────────────────────────────

export function useCreateInterview(assetId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data?: { title?: string }) => createInterview(assetId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: interviewKeys.byAsset(assetId!),
      });
    },
  });
}

// ─── Update ──────────────────────────────────────────────────

export function useUpdateInterview(
  assetId: string | undefined,
  interviewId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      updateInterview(assetId!, interviewId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: interviewKeys.detail(interviewId!),
      });
      queryClient.invalidateQueries({
        queryKey: interviewKeys.byAsset(assetId!),
      });
    },
  });
}

// ─── Delete ──────────────────────────────────────────────────

export function useDeleteInterview(assetId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (interviewId: string) =>
      deleteInterview(assetId!, interviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: interviewKeys.byAsset(assetId!),
      });
    },
  });
}

// ─── Duplicate ───────────────────────────────────────────────

export function useDuplicateInterview(assetId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (interviewId: string) =>
      duplicateInterview(assetId!, interviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: interviewKeys.byAsset(assetId!),
      });
    },
  });
}

// ─── Questions ───────────────────────────────────────────────

export function useAddQuestion(
  assetId: string | undefined,
  interviewId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      linkedAssetId?: string;
      questionType: string;
      questionText: string;
      answerOptions?: string[];
    }) => addQuestion(assetId!, interviewId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: interviewKeys.detail(interviewId!),
      });
    },
  });
}

export function useUpdateQuestion(
  assetId: string | undefined,
  interviewId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      questionId,
      data,
    }: {
      questionId: string;
      data: Record<string, unknown>;
    }) => updateQuestion(assetId!, interviewId!, questionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: interviewKeys.detail(interviewId!),
      });
    },
  });
}

export function useDeleteQuestion(
  assetId: string | undefined,
  interviewId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) =>
      deleteQuestion(assetId!, interviewId!, questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: interviewKeys.detail(interviewId!),
      });
    },
  });
}

// ─── Actions ─────────────────────────────────────────────────

export function useCompleteInterview(
  assetId: string | undefined,
  interviewId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => completeInterview(assetId!, interviewId!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: interviewKeys.detail(interviewId!),
      });
      queryClient.invalidateQueries({
        queryKey: interviewKeys.byAsset(assetId!),
      });
    },
  });
}

export function useApproveInterview(
  assetId: string | undefined,
  interviewId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approveInterview(assetId!, interviewId!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: interviewKeys.detail(interviewId!),
      });
      queryClient.invalidateQueries({
        queryKey: interviewKeys.byAsset(assetId!),
      });
      queryClient.invalidateQueries({ queryKey: brandAssetKeys.all });
      queryClient.invalidateQueries({
        queryKey: ["brand-asset-detail", assetId!],
      });
    },
  });
}

// ─── Templates ───────────────────────────────────────────────

export function useInterviewTemplates(
  assetId: string | undefined,
  category?: string,
) {
  return useQuery({
    queryKey: [...interviewKeys.templates(assetId ?? ""), category] as const,
    queryFn: () => fetchTemplates(assetId!, category),
    enabled: !!assetId,
  });
}
