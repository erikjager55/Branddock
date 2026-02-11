"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type {
  CreateInterviewInput,
  UpdateInterviewInput,
} from "@/lib/validations/interview";

export interface Interview {
  id: string;
  title: string | null;
  status:
    | "TO_SCHEDULE"
    | "SCHEDULED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "IN_REVIEW"
    | "APPROVED";
  currentStep: number;
  contactName: string | null;
  contactPosition: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactCompany: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  duration: number;
  questions: unknown[] | null;
  selectedAssets: string[] | null;
  answers: Record<string, unknown> | null;
  generalNotes: string | null;
  completionRate: number;
  isLocked: boolean;
  lockedAt: string | null;
  approvedAt: string | null;
  assetId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewTemplate {
  id: string;
  name: string;
  description: string;
  questions: unknown[];
}

interface UseAssetInterviewsParams {
  assetId: string;
  status?: string;
}

export function useAssetInterviews({ assetId, status }: UseAssetInterviewsParams) {
  return useQuery({
    queryKey: ["knowledge", "interviews", "asset", assetId, { status }],
    queryFn: () =>
      api.get<Interview[]>(`/api/assets/${assetId}/interviews`, { status }),
    enabled: !!assetId,
  });
}

export function useInterview(interviewId: string) {
  return useQuery({
    queryKey: ["knowledge", "interviews", interviewId],
    queryFn: () => api.get<Interview>(`/api/interviews/${interviewId}`),
    enabled: !!interviewId,
  });
}

export function useCreateInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assetId,
      ...data
    }: { assetId: string } & CreateInterviewInput) =>
      api.post<Interview>(`/api/assets/${assetId}/interviews`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "interviews", "asset", variables.assetId],
      });
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "assets"],
      });
    },
  });
}

export function useUpdateInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      interviewId,
      ...data
    }: { interviewId: string } & UpdateInterviewInput) =>
      api.patch<Interview>(`/api/interviews/${interviewId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "interviews"],
      });
    },
  });
}

export function useDeleteInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (interviewId: string) =>
      api.delete(`/api/interviews/${interviewId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "interviews"],
      });
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "assets"],
      });
    },
  });
}

export function useLockInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (interviewId: string) =>
      api.patch<Interview>(`/api/interviews/${interviewId}/lock`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "interviews"],
      });
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "assets"],
      });
    },
  });
}

export function useUnlockInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (interviewId: string) =>
      api.patch<Interview>(`/api/interviews/${interviewId}/unlock`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "interviews"],
      });
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "assets"],
      });
    },
  });
}

export function useDuplicateInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (interviewId: string) =>
      api.post<Interview>(`/api/interviews/${interviewId}/duplicate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "interviews"],
      });
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "assets"],
      });
    },
  });
}

export function useInterviewTemplates() {
  return useQuery({
    queryKey: ["knowledge", "interview-templates"],
    queryFn: () =>
      api.get<InterviewTemplate[]>("/api/interview-templates"),
  });
}
