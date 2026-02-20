import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStepResponse } from "../api/workshop.api";
import { workshopKeys } from "./useWorkshops";

export function useUpdateStepResponse(workshopId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      stepNumber,
      data,
    }: {
      stepNumber: number;
      data: { response?: string; isCompleted?: boolean };
    }) => updateStepResponse(workshopId!, stepNumber, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workshopKeys.detail(workshopId!),
      });
    },
  });
}
