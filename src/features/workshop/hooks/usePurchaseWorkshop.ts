import { useMutation, useQueryClient } from "@tanstack/react-query";
import { purchaseWorkshop } from "../api/workshop.api";
import type { PurchasePayload } from "../types/workshop-purchase.types";
import { workshopKeys } from "./useWorkshops";

export function usePurchaseWorkshop(assetId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PurchasePayload) =>
      purchaseWorkshop(assetId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workshopKeys.list(assetId) });
      queryClient.invalidateQueries({ queryKey: ["brand-asset-detail", assetId] });
    },
  });
}
