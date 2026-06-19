// =============================================================
// Content-item (deliverable-type) categorie → MediaCategory.
// Pure mapping zodat AI-gegenereerde content-item-beelden
// doorzoekbaar in de Media Library landen (zie import-generated-image.ts).
// =============================================================

import type { MediaCategory } from "@prisma/client";

/**
 * Map de categorie van een deliverable-type (zie `deliverable-types.ts`,
 * bv. "Social Media", "Advertising & Paid", "Website & Landing Pages")
 * naar een `MediaCategory`. Overige/onbekende categorieën vallen terug op
 * `LIFESTYLE` — gelijk aan de #325-default voor LP-feature-beelden.
 */
const DELIVERABLE_CATEGORY_TO_MEDIA: Record<string, MediaCategory> = {
  "Social Media": "SOCIAL_MEDIA",
  "Advertising & Paid": "ADVERTISEMENT",
  "Website & Landing Pages": "HERO_IMAGE",
};

/**
 * Resolve de MediaCategory voor een content-item op basis van de
 * deliverable-type-categorie. Geef `undefined`/onbekend door → `LIFESTYLE`.
 */
export function resolveMediaCategory(
  deliverableCategory?: string | null,
): MediaCategory {
  return DELIVERABLE_CATEGORY_TO_MEDIA[deliverableCategory ?? ""] ?? "LIFESTYLE";
}
