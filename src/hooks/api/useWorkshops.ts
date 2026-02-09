"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type {
  CreateWorkshopInput,
  UpdateWorkshopInput,
} from "@/lib/validations/workshop";

export interface Workshop {
  id: string;
  title: string;
  status: "DRAFT" | "PURCHASED" | "IN_PROGRESS" | "COMPLETED";
  type: string;
  bundle: string | null;
  hasFacilitator: boolean;
  purchaseAmount: number | null;
  purchasedAt: string | null;
  currentStep: number;
  totalSteps: number;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  facilitator: string | null;
  participantCount: number;
  participants: unknown[] | null;
  stepResponses: Record<string, unknown> | null;
  canvas: Record<string, unknown> | null;
  objectives: unknown[] | null;
  agenda: unknown[] | null;
  aiReport: Record<string, unknown> | null;
  notes: unknown[] | null;
  gallery: unknown[] | null;
  assetId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export function useAssetWorkshops(assetId: string) {
  return useQuery({
    queryKey: ["knowledge", "workshops", "asset", assetId],
    queryFn: () =>
      api.get<Workshop[]>(`/api/assets/${assetId}/workshops`),
    enabled: !!assetId,
  });
}

export function useWorkshop(workshopId: string) {
  return useQuery({
    queryKey: ["knowledge", "workshops", workshopId],
    queryFn: () => api.get<Workshop>(`/api/workshops/${workshopId}`),
    enabled: !!workshopId,
  });
}

export function useCreateWorkshop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assetId,
      ...data
    }: { assetId: string } & CreateWorkshopInput) =>
      api.post<Workshop>(`/api/assets/${assetId}/workshops`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "workshops", "asset", variables.assetId],
      });
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "assets"],
      });
    },
  });
}

export function useUpdateWorkshop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workshopId,
      ...data
    }: { workshopId: string } & UpdateWorkshopInput) =>
      api.patch<Workshop>(`/api/workshops/${workshopId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "workshops"],
      });
    },
  });
}

export function useCompleteWorkshop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workshopId: string) =>
      api.patch<Workshop>(`/api/workshops/${workshopId}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "workshops"],
      });
      queryClient.invalidateQueries({
        queryKey: ["knowledge", "assets"],
      });
    },
  });
}
