// =============================================================
// Preview URL resolver
//
// Centralised logic for deciding which URL to use as an image
// preview on a media card. Falls back to fileUrl when a dedicated
// thumbnail is missing, and trusts the MIME type rather than the
// mediaType enum so misclassified uploads (e.g. an image that
// landed with mediaType=DOCUMENT because of a bad content-type
// header) still render a preview.
// =============================================================

export interface MediaPreviewInput {
  mediaType?: string | null;
  fileType?: string | null;
  thumbnailUrl?: string | null;
  fileUrl?: string | null;
}

/**
 * True if the asset should render as an image preview, based on
 * either its stored mediaType or its underlying MIME type.
 */
export function isPreviewableImage(asset: MediaPreviewInput): boolean {
  if (asset.mediaType === 'IMAGE') return true;
  const ft = asset.fileType?.toLowerCase() ?? '';
  return ft.startsWith('image/');
}

/**
 * Best image URL to show on a card:
 *   1. the full fileUrl (sharp on retina displays)
 *   2. dedicated thumbnail as fallback
 *   3. null if the asset is not previewable
 *
 * We prefer fileUrl because thumbnails are typically 300px wide,
 * which looks blurry on retina displays where cards need 350px+.
 */
export function getPreviewImageUrl(asset: MediaPreviewInput): string | null {
  if (!isPreviewableImage(asset)) return null;
  return asset.fileUrl || asset.thumbnailUrl || null;
}
