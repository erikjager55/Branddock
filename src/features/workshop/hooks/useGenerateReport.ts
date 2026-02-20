import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generateWorkshopReport } from "../api/workshop.api";
import { workshopKeys } from "./useWorkshops";

export function useGenerateWorkshopReport(workshopId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateWorkshopReport(workshopId!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workshopKeys.report(workshopId!),
      });
      queryClient.invalidateQueries({
        queryKey: workshopKeys.detail(workshopId!),
      });
    },
  });
}
