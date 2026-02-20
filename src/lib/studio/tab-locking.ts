// =============================================================
// Tab lock logic — a tab is locked after content has been
// generated in it (prevents accidental tab switching)
// =============================================================

export function isTabLocked(
  tab: string,
  deliverable: {
    generatedText: string | null;
    generatedImageUrls: string[];
    generatedVideoUrl: string | null;
    generatedSlides: unknown | null;
    contentTab: string | null;
  },
): boolean {
  // Current tab is never locked
  if (deliverable.contentTab === tab) return false;

  switch (tab) {
    case 'text':
      return !!deliverable.generatedText;
    case 'images':
      return deliverable.generatedImageUrls.length > 0;
    case 'video':
      return !!deliverable.generatedVideoUrl;
    case 'carousel':
      return !!deliverable.generatedSlides;
    default:
      return false;
  }
}
