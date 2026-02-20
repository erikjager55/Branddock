import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeWorkshop } from "../api/workshop.api";
import { workshopKeys } from "./useWorkshops";
import { brandAssetKeys } from "@/hooks/use-brand-assets";

export function useCompleteWorkshop(workshopId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => completeWorkshop(workshopId!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workshopKeys.detail(workshopId!),
      });
      queryClient.invalidateQueries({ queryKey: workshopKeys.all });
      // Research method cascade: WORKSHOP → COMPLETED affects validation %
      queryClient.invalidateQueries({ queryKey: brandAssetKeys.all });
    },
  });
}
