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
  /**
   * F35 (audit 2026-05-13): optional smart-default seed values from
   * visualBrief. Tabs die search/prompt-input hebben gebruiken dit als
   * initiële waarde — user kan altijd overschrijven.
   *  - initialQuery: voor StockPhotosTab search-input
   *  - initialPrompt: voor GenerateImageTab + UrlImportTab (zelden zinvol)
   */
  initialQuery?: string;
  initialPrompt?: string;
}
