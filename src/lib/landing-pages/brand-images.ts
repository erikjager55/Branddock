/**
 * P2 — beeld-producer: vult ontbrekende beeld-slots (hero + feature-cards) van
 * een landing-page variant met de brand-eigen `brandImages` (gescrapte/geüploade
 * merk-beelden uit de styleguide). Zo krijgen merken MÉT bronbeeld automatisch
 * echte foto's in plaats van placeholders.
 *
 * Pure functie — geen DB/DOM. Vult ALLEEN lege slots (een al-toegekend feature-
 * beeld of een AI-gegenereerde hero-foto blijft). Wijst in volgorde toe: eerste
 * image → hero (als die leeg is), daarna één image per feature zonder beeld.
 *
 * NB: dit dekt merken MÉT brandImages (bv. Adullam). Merken zonder bronbeeld
 * (zwarthout = null) hebben AI-per-feature-gen nodig — een aparte infra/kosten-
 * beslissing, niet deze deterministische mapping.
 */
import type { LandingPageVariantContent } from "./variant-schema";

export interface BrandImage {
  url: string;
  alt?: string | null;
  context?: string | null;
}

/** Parse het losse `BrandStyleguide.brandImages` Json-veld naar BrandImage[]. */
export function parseBrandImages(raw: unknown): BrandImage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b): b is { url?: unknown; alt?: unknown; context?: unknown } => !!b && typeof b === "object")
    .map((b) => ({
      url: typeof b.url === "string" ? b.url.trim() : "",
      alt: typeof b.alt === "string" ? b.alt : null,
      context: typeof b.context === "string" ? b.context : null,
    }))
    // Alleen laad-bare URLs (http(s) of root-relative upload-pad) — anders zou
    // een malformed brandImages.url ongevalideerd naar <img src> lekken (de
    // AI-feature-imageUrl wordt wél door het schema .url()-gevalideerd).
    .filter((b) => /^https?:\/\//i.test(b.url) || b.url.startsWith("/"));
}

/**
 * Vul lege hero/feature-beeld-slots met brandImages (in volgorde). Returnt een
 * nieuwe variant; muteert de input niet.
 */
export function assignBrandImagesToVariant(
  variant: LandingPageVariantContent,
  brandImages: BrandImage[] | null | undefined,
): LandingPageVariantContent {
  const urls = (brandImages ?? []).map((b) => b?.url).filter((u): u is string => typeof u === "string" && u.length > 0);
  if (urls.length === 0) return variant;

  let idx = 0;
  const hero = { ...variant.hero };
  if (!hero.heroVisualUrl && idx < urls.length) {
    hero.heroVisualUrl = urls[idx++];
  }
  const items = variant.features.items.map((item) => {
    if (!item.imageUrl && idx < urls.length) {
      return { ...item, imageUrl: urls[idx++] };
    }
    return item;
  });

  return { ...variant, hero, features: { ...variant.features, items } };
}
