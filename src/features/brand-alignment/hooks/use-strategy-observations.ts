"use client";

// =============================================================
// Hooks voor Brandclaw Strategy Observations (Phase A).
// =============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchStrategyObservations,
  patchObservation,
  runStrategyAnalystApi,
  type ListObservationsFilters,
  type ListObservationsResult,
  type ObservationAction,
  type RunAnalystResult,
} from "../api/brandclaw-observations.api";

const QUERY_KEY = ["brandclaw", "strategy-observations"] as const;

export function useStrategyObservations(filters: ListObservationsFilters = {}) {
  return useQuery<ListObservationsResult, Error>({
    queryKey: [...QUERY_KEY, filters],
    queryFn: () => fetchStrategyObservations(filters),
    staleTime: 30_000,
  });
}

export function useRunStrategyAnalyst() {
  const queryClient = useQueryClient();
  return useMutation<RunAnalystResult, Error>({
    mutationFn: () => runStrategyAnalystApi(),
    onSuccess: () => {
      // Invalidate alle observation-queries — UI ziet meteen nieuwe rows
      // zonder dat caller filters hoeft mee te geven.
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function usePatchObservation() {
  const queryClient = useQueryClient();
  return useMutation<
    Awaited<ReturnType<typeof patchObservation>>,
    Error,
    { id: string; action: ObservationAction; reason?: string }
  >({
    mutationFn: ({ id, action, reason }) => patchObservation(id, action, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
