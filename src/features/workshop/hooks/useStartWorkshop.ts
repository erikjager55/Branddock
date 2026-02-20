import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startWorkshop } from "../api/workshop.api";
import { workshopKeys } from "./useWorkshops";

export function useStartWorkshop(workshopId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => startWorkshop(workshopId!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workshopKeys.detail(workshopId!),
      });
    },
  });
}
