import { useQuery } from "@tanstack/react-query";
import { fetchWorkshopReport } from "../api/workshop.api";
import { workshopKeys } from "./useWorkshops";

export function useWorkshopReport(
  workshopId: string | undefined,
  enabled: boolean = false,
) {
  return useQuery({
    queryKey: workshopKeys.report(workshopId ?? ""),
    queryFn: () => fetchWorkshopReport(workshopId!),
    enabled: !!workshopId && enabled,
    staleTime: 60_000,
  });
}
