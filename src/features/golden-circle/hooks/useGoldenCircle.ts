import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchGoldenCircle,
  updateGoldenCircle,
  toggleGoldenCircleLock,
  fetchGoldenCircleHistory,
} from "../api/golden-circle.api";

export const goldenCircleKeys = {
  all: ["golden-circle"] as const,
  data: (assetId: string) => ["golden-circle", assetId] as const,
  history: (assetId: string) => ["golden-circle", "history", assetId] as const,
};

export function useGoldenCircleData(assetId: string | undefined) {
  return useQuery({
    queryKey: goldenCircleKeys.data(assetId ?? ""),
    queryFn: () => fetchGoldenCircle(assetId!),
    enabled: !!assetId,
  });
}

export function useUpdateGoldenCircle(assetId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      why?: { statement: string; details: string };
      how?: { statement: string; details: string };
      what?: { statement: string; details: string };
    }) => updateGoldenCircle(assetId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: goldenCircleKeys.data(assetId!),
      });
    },
  });
}

export function useToggleGoldenCircleLock(assetId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (locked: boolean) => toggleGoldenCircleLock(assetId!, locked),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: goldenCircleKeys.data(assetId!),
      });
    },
  });
}

export function useGoldenCircleHistory(assetId: string | undefined) {
  return useQuery({
    queryKey: goldenCircleKeys.history(assetId ?? ""),
    queryFn: () => fetchGoldenCircleHistory(assetId!),
    enabled: !!assetId,
  });
}
