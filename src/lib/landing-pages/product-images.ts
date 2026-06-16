/**
 * W2 (plan §2.3 stap 7) — product-beeld-producer: vult lege hero/feature-beeld-
 * slots van een product-page variant met de échte ProductImages van het
 * gekoppelde product. Spiegelt brand-images.ts; draait VÓÓR de brand-image-
 * fallback zodat een productfoto altijd wint van een generiek merkbeeld.
 *
 * Toewijzing (plan §2.3): HERO/SCREENSHOT → hero-slot; FEATURE/DETAIL/LIFESTYLE
 * (+ overige product-shots) → feature-slots op sortOrder. Pure functie — geen
 * DB/DOM, muteert de input niet. Library-first matching (#323) blijft het
 * vangnet voor wat hierna nog leeg is.
 */

import type { ProductImageContext } from "../ai/canvas-context";
import type { ProductPageVariantContent } from "./page-type-schemas";

/** Categorieën die een hero-beeld leveren (productshot die de hele propositie draagt). */
const HERO_CATEGORIES = new Set(["HERO", "SCREENSHOT"]);
/** Categorieën die feature-bewijs leveren (detail/gebruik/context). */
const FEATURE_CATEGORIES = new Set([
  "FEATURE", "DETAIL", "LIFESTYLE", "MOCKUP", "PACKAGING", "GROUP", "PROCESS", "DIAGRAM",
]);

/** Alleen laad-bare URLs (http(s) of root-relative upload-pad), net als brand-images. */
function loadableUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith("/");
}

/**
 * Vul lege hero/feature-beeld-slots met de ProductImages (op sortOrder). Returnt
 * een nieuwe variant; muteert de input niet. No-op wanneer er geen laad-bare
 * productbeelden zijn.
 */
export function assignProductImagesToVariant(
  variant: ProductPageVariantContent,
  images: ProductImageContext[] | null | undefined,
): ProductPageVariantContent {
  // images komen al op sortOrder gesorteerd uit Layer 7; filter op laad-baar.
  const valid = (images ?? []).filter(
    (img) => typeof img?.url === "string" && img.url.length > 0 && loadableUrl(img.url),
  );
  if (valid.length === 0) return variant;

  const used = new Set<string>();

  const hero = { ...variant.hero };
  if (!hero.heroVisualUrl) {
    const heroImg = valid.find((img) => HERO_CATEGORIES.has(img.category));
    if (heroImg) {
      hero.heroVisualUrl = heroImg.url;
      used.add(heroImg.url);
    }
  }

  // Feature-pool: eerst de echte feature-categorieën, dan overige product-shots
  // (geen hero-categorieën) als aanvulling — beide al op sortOrder.
  const featurePool = [
    ...valid.filter((img) => FEATURE_CATEGORIES.has(img.category) && !used.has(img.url)),
    ...valid.filter(
      (img) =>
        !FEATURE_CATEGORIES.has(img.category) &&
        !HERO_CATEGORIES.has(img.category) &&
        !used.has(img.url),
    ),
  ];

  let poolIdx = 0;
  const features = variant.features.map((feature) => {
    if (!feature.imageUrl && poolIdx < featurePool.length) {
      const url = featurePool[poolIdx++].url;
      used.add(url);
      return { ...feature, imageUrl: url };
    }
    return feature;
  });

  return { ...variant, hero, features };
}
