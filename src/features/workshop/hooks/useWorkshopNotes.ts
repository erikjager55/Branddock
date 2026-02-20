import { useQuery } from "@tanstack/react-query";
import { fetchWorkshopNotes } from "../api/workshop.api";
import { workshopKeys } from "./useWorkshops";

export function useWorkshopNotes(
  workshopId: string | undefined,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: workshopKeys.notes(workshopId ?? ""),
    queryFn: () => fetchWorkshopNotes(workshopId!),
    enabled: !!workshopId && enabled,
  });
}
