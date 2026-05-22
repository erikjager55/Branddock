// =============================================================
// Competitor Activity Hooks — list, acknowledge, summary.
// =============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCompetitorActivities,
  fetchCompetitorActivitySummary,
  acknowledgeCompetitorActivities,
} from "../api/competitors.api";
import { competitorKeys } from "./index";
import { dashboardKeys } from "@/hooks/use-dashboard";
import type { ActivityFilters } from "../types/activity";

export const competitorActivityKeys = {
  all: ["competitors", "activities"] as const,
  list: (competitorId: string, filters: ActivityFilters) =>
    [...competitorActivityKeys.all, competitorId, filters] as const,
  summary: (window: "7d" | "30d") =>
    ["competitors", "activity-summary", window] as const,
};

export function useCompetitorActivities(
  competitorId: string | null | undefined,
  filters: ActivityFilters = {},
) {
  return useQuery({
    queryKey: competitorActivityKeys.list(competitorId ?? "", filters),
    queryFn: () => fetchCompetitorActivities(competitorId!, filters),
    enabled: !!competitorId,
    staleTime: 30_000,
  });
}

export function useAcknowledgeActivities(competitorId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { activityIds: string[] } | { all: true }) =>
      acknowledgeCompetitorActivities(competitorId!, body),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [...competitorActivityKeys.all, competitorId],
      });
      if (competitorId) {
        qc.invalidateQueries({ queryKey: competitorKeys.detail(competitorId) });
      }
      qc.invalidateQueries({ queryKey: ["competitors", "activity-summary"] });
      qc.invalidateQueries({ queryKey: dashboardKeys.attention });
    },
  });
}

export function useCompetitorActivitySummary(window: "7d" | "30d" = "7d") {
  return useQuery({
    queryKey: competitorActivityKeys.summary(window),
    queryFn: () => fetchCompetitorActivitySummary(window),
    staleTime: 60_000,
  });
}
