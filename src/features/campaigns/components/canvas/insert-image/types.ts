/**
 * Shared types for the InsertImageModal tabs.
 *
 * Each tab fires onSelected with the resolved image URL and optional
 * MediaAsset id. The parent modal forwards this to the canvas store
 * (heroImage) and closes itself.
 */
export interface InsertImageSelection {
  url: string;
  mediaAssetId: string | null;
  alt?: string;
}

export interface InsertImageTabProps {
  onSelected: (selection: InsertImageSelection) => void;
}
