// =============================================================
// Pattern G5 image-quality-chain — Illustration pipeline templates.
//
// Per content-type een default illustration-style die als prompt-prefix
// wordt geïnjecteerd wanneer de gebruiker chip='illustration' kiest. Voor
// style-consistency tussen content-items binnen één campagne; voorkomt
// dat een explainer-video flat-illustration mixt met een tweet 3D-render.
//
// Pre-launch v1 templates zijn prompt-templating-based. Toekomstige v2
// integreert workspace ConsistentModel LoRA's voor pixel-stable consistency
// (zelfde character recurring across content-items).
// =============================================================

/**
 * Illustration-style buckets — gebaseerd op industry-standard illustration
 * categorieën die FLUX/DALL-E/Gemini onderscheidende output voor leveren.
 */
export type IllustrationStyle =
  | "flat"
  | "3d"
  | "hand-drawn"
  | "minimalist"
  | "editorial";

/**
 * Per-style prompt-snippet. Wordt vooraan in de positive-prompt geplaatst
 * zodat de style-keuze het sterkste signaal blijft (eerste tokens worden
 * zwaarder gewogen door image-models).
 *
 * Snippets zijn bewust beknopt (1-2 zinnen, ~150 chars) zodat ze binnen
 * de model-specific prompt-caps blijven (Recraft 1000 chars, FLUX 3000).
 */
export const ILLUSTRATION_TEMPLATES: Record<IllustrationStyle, string> = {
  flat:
    "Flat illustration style: bold geometric shapes, no gradients, solid color fills, minimal shading. Clean vector aesthetic with confident outlines. Modern editorial flat-design — think Behance editorial illustration 2024-2026 vintage.",
  "3d":
    "3D rendered illustration: stylized soft-realistic forms, ambient-occlusion shading, isometric or slight perspective camera. Friendly subsurface-scattering on characters. Pixar/Cinema 4D-style charm, NOT photo-real CGI.",
  "hand-drawn":
    "Hand-drawn illustration: visible pencil/ink line-work with intentional imperfection, gentle watercolor or marker washes, organic textures. Sketchbook aesthetic with personality. Avoid digital-vector cleanliness.",
  minimalist:
    "Minimalist illustration: maximum 2-3 colors, large negative space, single conceptual element. Restrained line-weight, no decorative noise. Editorial / corporate-minimal aesthetic à la Apple keynote slides.",
  editorial:
    "Editorial illustration: magazine-style conceptual visual with metaphor or visual pun. Mixed-media feel (digital + textured fills), strong narrative composition. Think New Yorker / The Atlantic visual columns.",
};

/**
 * Default illustration-style per content-type. Voor types die typisch
 * illustration-output krijgen (uit modality-fit defaults G1).
 *
 * Defaults gekozen op style-fit:
 * - long-form blog/landing: editorial (storytelling depth)
 * - social-media tweets/posts: flat (snel scanbaar, kleurrijk)
 * - explainer-video: 3d (motion-graphics-vriendelijke base)
 * - tiktok / data-driven: minimalist (focus op concept, geen visuele ruis)
 * - hand-drawn als safe-default voor minder-getypeerde content
 */
const ILLUSTRATION_DEFAULTS: Record<string, IllustrationStyle> = {
  // Social media — flat scant goed in feeds
  "twitter-post": "flat",
  tweet: "flat",
  "linkedin-post": "flat",
  "facebook-post": "flat",
  "instagram-post": "flat",
  "instagram-post-carousel": "flat",
  // Long-form — editorial brengt verhaal-diepte
  "blog-post": "editorial",
  "landing-page": "editorial",
  "case-study": "editorial",
  "press-release": "editorial",
  newsletter: "editorial",
  // Video — 3d voor motion-graphics-vriendelijke base
  "explainer-video": "3d",
  "video-ad": "3d",
  "linkedin-video": "3d",
  "promo-video": "3d",
  // Short-form / data — minimalist voor concept-focus
  "tiktok-script": "minimalist",
  "infographic": "minimalist",
  "one-pager": "minimalist",
  report: "minimalist",
  // Ads — flat voor scanbaar conversiebeeld
  "display-ad": "flat",
  "facebook-ad": "flat",
};

/**
 * Lookup default illustration-style voor een content-type.
 * Default fallback `hand-drawn` — meest neutrale stijl die in de meeste
 * brand-contexts goed scoort op style-coherence dimensie.
 */
export function getDefaultIllustrationStyle(deliverableTypeId: string): IllustrationStyle {
  return ILLUSTRATION_DEFAULTS[deliverableTypeId] ?? "hand-drawn";
}

/**
 * Resolve prompt-template voor een content-type. Returns de
 * style-snippet-string die in de positive-prompt vooraan komt te staan.
 *
 * @param deliverableTypeId content-type id (e.g. 'blog-post')
 * @param overrideStyle optionele user-override (toekomstige UI-dropdown)
 */
export function getIllustrationTemplateForType(
  deliverableTypeId: string,
  overrideStyle?: IllustrationStyle,
): { style: IllustrationStyle; template: string } {
  const style = overrideStyle ?? getDefaultIllustrationStyle(deliverableTypeId);
  return {
    style,
    template: ILLUSTRATION_TEMPLATES[style],
  };
}

/**
 * User-friendly labels voor toekomstige UI-dropdown.
 */
export const ILLUSTRATION_STYLE_LABELS: Record<IllustrationStyle, string> = {
  flat: "Flat / vector",
  "3d": "3D rendered",
  "hand-drawn": "Hand-drawn",
  minimalist: "Minimalist",
  editorial: "Editorial",
};
