"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type {
  CreateQuestionnaireInput,
  UpdateQuestionnaireInput,
} from "@/lib/validations/questionnaire";

export interface Questionnaire {
  id: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "COLLECTING" | "ANALYZED" | "VALIDATED";
  currentStep: number;
  questions: unknown[] | null;
  distributionMethod: string;
  emailSubject: string | null;
  emailBody: string | null;
  isAnonymous: boolean;
  allowMultiple: boolean;
  reminderDays: number | null;
  shareableLink: string | null;
  recipients: unknown[] | null;
  totalResponses: number;
  responseRate: number;
  completionRate: number;
  avgTime: number | null;
  responses: unknown[] | null;
  aiInsights: Record<string, unknown> | null;
  isValidated: boolean;
  isLocked: boolean;
  validatedAt: string | null;
  assetId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionnaireResponse {
  id: string;
  respondentId: string | null;
  answers: Record<string, unknown>;
  completionTime: number | null;
  submittedAt: string;
}

interface UseAssetQuestionnairesParams {
  assetId: string;
  status?: string;
}

export function useAssetQuestionnaires({
  assetId,
  status,
}: UseAssetQuestionnairesParams) {
  return useQuery({
    queryKey: ["knowledge", "questionnaires", "asset", assetId, { status }],
    queryFn: () =>
      api.get<Questionnaire[]>(`/api/assets/${assetId}/questionnaires`, {
        status,
      }),
    enabled: !!assetId,
  });
}

export function useQuestionnaire(questionnaireId: string) {
  return useQuery({
    queryKey: ["knowledge", "questionnaires", questionnaireId],
    queryFn: () =>
      api.get<Questionnaire>(`/api/questionnaires/${questionnaireId}`),
    enabled: !!questionnaireId,
  });
}

export function useCreateQuestionnaire() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assetId,
      ...data
    }: { assetId: string } & CreateQuestionnaireInput) =>
      api.post<Questionnaire>(
        `/api/assets/${assetId}/questionnaires`,
        data
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "knowledge",
          "questionnaires",
          "asset",
          variables.assetId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "assets"],
      });
    },
  });
}

export function useUpdateQuestionnaire() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questionnaireId,
      ...data
    }: { questionnaireId: string } & UpdateQuestionnaireInput) =>
      api.patch<Questionnaire>(
        `/api/questionnaires/${questionnaireId}`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "questionnaires"],
      });
    },
  });
}

export function useDeleteQuestionnaire() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questionnaireId: string) =>
      api.delete(`/api/questionnaires/${questionnaireId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "questionnaires"],
      });
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "assets"],
      });
    },
  });
}

export function useValidateQuestionnaire() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questionnaireId: string) =>
      api.patch<Questionnaire>(
        `/api/questionnaires/${questionnaireId}/validate`,
        {}
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "questionnaires"],
      });
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "assets"],
      });
    },
  });
}

export function useSendQuestionnaire() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questionnaireId,
      ...data
    }: {
      questionnaireId: string;
      recipients?: Array<{ email: string; name?: string }>;
    }) =>
      api.post<Questionnaire>(
        `/api/questionnaires/${questionnaireId}/send`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "questionnaires"],
      });
    },
  });
}

export function useQuestionnaireResponses(questionnaireId: string) {
  return useQuery({
    queryKey: [
      "knowledge",
      "questionnaires",
      questionnaireId,
      "responses",
    ],
    queryFn: () =>
      api.get<QuestionnaireResponse[]>(
        `/api/questionnaires/${questionnaireId}/responses`
      ),
    enabled: !!questionnaireId,
  });
}
