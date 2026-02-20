import { useMutation } from "@tanstack/react-query";
import { previewImpact } from "../api/workshop.api";

export function usePreviewImpact(assetId: string) {
  return useMutation({
    mutationFn: (selectedAssetIds: string[]) =>
      previewImpact(assetId, { selectedAssetIds }),
  });
}
