import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addWorkshopNote } from "../api/workshop.api";
import { workshopKeys } from "./useWorkshops";

export function useAddNote(workshopId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      authorName: string;
      authorRole?: string;
      content: string;
    }) => addWorkshopNote(workshopId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workshopKeys.notes(workshopId!),
      });
    },
  });
}
