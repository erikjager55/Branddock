import { useQuery } from "@tanstack/react-query";
import { fetchWorkshops, fetchBundles } from "../api/workshop.api";

export const workshopKeys = {
  all: ["workshops"] as const,
  list: (assetId: string) => ["workshops", assetId] as const,
  bundles: (assetId: string) => ["workshops", "bundles", assetId] as const,
  detail: (workshopId: string) => ["workshops", "detail", workshopId] as const,
  report: (workshopId: string) => ["workshops", "report", workshopId] as const,
  notes: (workshopId: string) => ["workshops", "notes", workshopId] as const,
};

export function useWorkshops(assetId: string) {
  return useQuery({
    queryKey: workshopKeys.list(assetId),
    queryFn: () => fetchWorkshops(assetId),
    enabled: !!assetId,
  });
}

export function useWorkshopBundles(assetId: string) {
  return useQuery({
    queryKey: workshopKeys.bundles(assetId),
    queryFn: () => fetchBundles(assetId),
    enabled: !!assetId,
  });
}
