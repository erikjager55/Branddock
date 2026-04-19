// =============================================================
// Brandstyle Review Sections — Fase 2
// =============================================================
//
// Centrale lijst van secties die gereviewd moeten worden voor de
// Published-toggle actief wordt. Sommige secties komen pas in latere
// fases online (typografie-rollen in Fase 3, spacing in Fase 4,
// components in Fase 5); die staan al in de union, maar niet in
// ACTIVE_REVIEW_SECTIONS — zo geeft de publish-gate pas fout als de
// sectie daadwerkelijk in de UI zichtbaar is.

export type ReviewSectionKey =
  // Brand Assets (Fase 1 — live)
  | "brand-assets-logos"
  | "brand-assets-fonts"
  // Secties (Fase 2 — live)
  | "colors"
  | "typography"
  | "tone-of-voice"
  | "imagery"
  | "visual-system"
  // Fase 3 — komt later
  | "colors-brand"
  | "colors-neutrals"
  | "colors-semantic"
  | "typography-display"
  | "typography-ui"
  | "typography-eyebrow"
  // Fase 4 — komt later
  | "spacing-scale"
  | "spacing-radii"
  | "spacing-shadow"
  // Fase 5 — komt later
  | "components-buttons"
  | "components-form-inputs"
  | "components-status-chips"
  | "components-product-cards"
  | "components-feature-icons"
  | "components-top-navigation"
  | "components-quote-blocks";

/** Sections currently visible in the UI — must be APPROVED before publish. */
export const ACTIVE_REVIEW_SECTIONS: readonly ReviewSectionKey[] = [
  "brand-assets-logos",
  "brand-assets-fonts",
  "colors",
  "typography",
  "tone-of-voice",
  "imagery",
  "visual-system",
] as const;

export const REVIEW_SECTION_LABELS: Record<ReviewSectionKey, string> = {
  "brand-assets-logos": "Logos",
  "brand-assets-fonts": "Fonts",
  colors: "Colors",
  typography: "Typography",
  "tone-of-voice": "Tone of Voice",
  imagery: "Imagery",
  "visual-system": "Visual System",
  "colors-brand": "Brand colors",
  "colors-neutrals": "Neutrals",
  "colors-semantic": "Semantic tints",
  "typography-display": "Display type",
  "typography-ui": "UI type",
  "typography-eyebrow": "Eyebrow & meta",
  "spacing-scale": "Spacing scale",
  "spacing-radii": "Corner radii",
  "spacing-shadow": "Shadow system",
  "components-buttons": "Buttons",
  "components-form-inputs": "Form inputs",
  "components-status-chips": "Status chips",
  "components-product-cards": "Product cards",
  "components-feature-icons": "Feature icons",
  "components-top-navigation": "Top navigation",
  "components-quote-blocks": "Quote blocks",
};

export function isValidReviewSection(value: string): value is ReviewSectionKey {
  return value in REVIEW_SECTION_LABELS;
}

export function isActiveReviewSection(value: string): boolean {
  return (ACTIVE_REVIEW_SECTIONS as readonly string[]).includes(value);
}
