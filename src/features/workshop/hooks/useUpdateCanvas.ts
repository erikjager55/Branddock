import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCanvas } from "../api/workshop.api";
import { workshopKeys } from "./useWorkshops";

export function useUpdateCanvas(workshopId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      canvasData: Record<string, unknown>;
      canvasLocked?: boolean;
    }) => updateCanvas(workshopId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workshopKeys.detail(workshopId!),
      });
      queryClient.invalidateQueries({
        queryKey: workshopKeys.report(workshopId!),
      });
    },
  });
}
