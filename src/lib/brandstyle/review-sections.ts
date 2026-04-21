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

/** Sections currently visible in the UI — must be APPROVED before publish.
 *  Tone of voice, imagery, and visual-system sections were removed from
 *  the review gate: those sections are AI-generated prose / reference
 *  content that the user consumes but doesn't "approve" the same way as
 *  brand tokens. */
export const ACTIVE_REVIEW_SECTIONS: readonly ReviewSectionKey[] = [
  "brand-assets-logos",
  "brand-assets-fonts",
  "colors-brand",
  "colors-neutrals",
  "colors-semantic",
  "typography-display",
  "typography-ui",
  "typography-eyebrow",
  "spacing-scale",
  "spacing-radii",
  "spacing-shadow",
  "components-buttons",
  "components-form-inputs",
  "components-status-chips",
  "components-product-cards",
  "components-feature-icons",
  "components-top-navigation",
  "components-quote-blocks",
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

/**
 * Shape of a styleguide just enough for the dynamic-applicable filter below.
 * Kept minimal so this helper is easy to call from both server (Prisma
 * return type) and client (BrandStyleguide type) without shared imports.
 */
interface StyleguideForSectionCheck {
  semanticColors?: unknown;
  colors?: Array<{ category: string }>;
  /** Scraped / uploaded fonts — used to filter out typography role review
   *  sections that have no font assigned (can't review an empty panel). */
  fonts?: Array<{ role: string }>;
  /** Detected components — used to filter out empty component review
   *  sections (BUTTON, FORM_INPUT, etc.) that have zero samples. */
  components?: Array<{ type: string }>;
}

/**
 * Dynamic filter on top of ACTIVE_REVIEW_SECTIONS: some sections shouldn't
 * gate publish when the analyzer genuinely has nothing for them and users
 * would just approve an empty panel out of frustration. Example: semantic
 * tints — auto-detection is not yet implemented, so if the scraper found
 * no SEMANTIC-category colors and no `semanticColors` JSON, asking the user
 * to review an empty section is meaningless noise.
 *
 * Returns the subset of ACTIVE_REVIEW_SECTIONS that genuinely need review
 * for this specific styleguide.
 */
export function getApplicableReviewSections(
  styleguide: StyleguideForSectionCheck | null | undefined,
): ReviewSectionKey[] {
  if (!styleguide) return [...ACTIVE_REVIEW_SECTIONS];

  const hasSemanticData = (() => {
    const sem = styleguide.semanticColors as
      | {
          info?: unknown;
          success?: unknown;
          warning?: unknown;
          danger?: unknown;
        }
      | null
      | undefined;
    if (sem && (sem.info || sem.success || sem.warning || sem.danger)) return true;
    // Legacy SEMANTIC-category colors count as data too.
    const legacy = (styleguide.colors ?? []).some((c) =>
      ["SEMANTIC", "SUCCESS", "WARNING", "ERROR_COLOR"].includes(c.category),
    );
    return legacy;
  })();

  // Typography roles: skip review sections for roles with zero fonts
  // assigned. An empty "Review display type" card is noise.
  const fonts = styleguide.fonts ?? [];
  const hasDisplayFont = fonts.some((f) => f.role === "DISPLAY");
  const hasUiFont = fonts.some((f) => f.role === "UI" || f.role === "BODY");
  const hasEyebrowFont = fonts.some((f) => f.role === "EYEBROW_META");

  // Component types: skip review sections for types with zero samples.
  const components = styleguide.components ?? [];
  const hasComponentOfType = (t: string) => components.some((c) => c.type === t);

  return ACTIVE_REVIEW_SECTIONS.filter((s) => {
    if (s === "colors-semantic" && !hasSemanticData) return false;
    if (s === "typography-display" && !hasDisplayFont) return false;
    if (s === "typography-ui" && !hasUiFont) return false;
    if (s === "typography-eyebrow" && !hasEyebrowFont) return false;
    if (s === "components-buttons" && !hasComponentOfType("BUTTON")) return false;
    if (s === "components-form-inputs" && !hasComponentOfType("FORM_INPUT")) return false;
    if (s === "components-status-chips" && !hasComponentOfType("STATUS_CHIP")) return false;
    if (s === "components-product-cards" && !hasComponentOfType("PRODUCT_CARD")) return false;
    if (s === "components-feature-icons" && !hasComponentOfType("FEATURE_ICON")) return false;
    if (s === "components-top-navigation" && !hasComponentOfType("TOP_NAVIGATION")) return false;
    if (s === "components-quote-blocks" && !hasComponentOfType("QUOTE_BLOCK")) return false;
    return true;
  });
}
