export type SelectionMode = "bundles" | "individual";

export interface PurchasePayload {
  bundleId?: string;
  selectedAssetIds?: string[];
  workshopCount: number;
  hasFacilitator: boolean;
}

export interface PreviewImpactPayload {
  selectedAssetIds: string[];
}

export interface ImpactPreview {
  assetId: string;
  assetName: string;
  currentStatus: string;
  afterStatus: string;
}

export interface PreviewImpactResponse {
  impacts: ImpactPreview[];
  updatedCount: number;
}
