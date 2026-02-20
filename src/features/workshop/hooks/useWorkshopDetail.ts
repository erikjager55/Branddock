import { useQuery } from "@tanstack/react-query";
import { fetchWorkshopDetail } from "../api/workshop.api";
import { workshopKeys } from "./useWorkshops";

export function useWorkshopDetail(workshopId: string | undefined) {
  return useQuery({
    queryKey: workshopKeys.detail(workshopId ?? ""),
    queryFn: () => fetchWorkshopDetail(workshopId!),
    enabled: !!workshopId,
    staleTime: 30_000,
  });
}
