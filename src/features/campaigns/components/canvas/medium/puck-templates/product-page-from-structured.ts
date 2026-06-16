/**
 * Product/service-page template-builder voor STRUCTURED variants (W1, plan
 * docs/specs/website-page-types-implementatieplan.md §2.1).
 *
 * Deterministische mapping van ProductPageVariantContent → Puck-data-tree:
 *   1. Hero (outcome-headline + primaryCta; secondaryCta heeft nog geen
 *      BrandHero-slot → W2).
 *   2. Probleem → oplossing als twee RichText-secties (band-afwisseling
 *      maakt het narratief-scharnier visueel).
 *   3. Features — zelfde slot-conventie als LP (heading/body/imageUrl):
 *      FeatureSplit bij volledige beeld-vulling, anders FeatureGrid.
 *   4. Optioneel: useCases (FeatureGrid), specs (RichText bold-label-lijst —
 *      RichText heeft geen GFM-tables), processSteps (RichText genummerde
 *      lijst), pricing (RichText prose, geen tiers in dit schema).
 *   5. Bezwaar-gedreven FAQ vlak voor de final CTA (plan §2.1).
 *   6. Final CTA (body in riskReducer-slot) + footer.
 *
 * Brand-image pre-pass: vult lege hero/feature-beeld-slots met brandImages,
 * analoog aan assignBrandImagesToVariant (die is LP-getypeerd; het product-
 * schema heeft features als array i.p.v. {items}).
 */

import type { Data } from "@puckeditor/core";
import type { CanvasContextStack } from "@/lib/ai/canvas-context";
import type { SpikePuckProps } from "../puck-config";
import type { ProductPageVariantContent } from "@/lib/landing-pages/page-type-schemas";
import type { BrandImage } from "@/lib/landing-pages/brand-images";
import { assignProductImagesToVariant } from "@/lib/landing-pages/product-images";
import { resolveCtaHref, assignSectionBands } from "./landing-page-from-structured";
import { instance, taglineFromSubline, footerInstance, type PuckInstance } from "./from-structured-shared";

type SpikeData = Data<SpikePuckProps>;

/** Vul lege hero/feature-beeld-slots met brandImages (in volgorde, immutable). */
function fillProductBrandImages(
  variant: ProductPageVariantContent,
  brandImages: BrandImage[] | null | undefined,
): ProductPageVariantContent {
  const urls = (brandImages ?? [])
    .map((b) => b?.url)
    .filter((u): u is string => typeof u === "string" && u.length > 0);
  if (urls.length === 0) return variant;

  let idx = 0;
  const hero = { ...variant.hero };
  if (!hero.heroVisualUrl && idx < urls.length) {
    hero.heroVisualUrl = urls[idx++];
  }
  const features = variant.features.map((feature) => {
    if (!feature.imageUrl && idx < urls.length) {
      return { ...feature, imageUrl: urls[idx++] };
    }
    return feature;
  });

  return { ...variant, hero, features };
}

function heroSection(v: ProductPageVariantContent, ctx: CanvasContextStack | null): PuckInstance {
  return instance("BrandHero", {
    headline: v.hero.headline,
    sub: v.hero.subline,
    ctaLabel: v.hero.primaryCta,
    ctaHref: resolveCtaHref(ctx),
    heroVisualUrl: v.hero.heroVisualUrl ?? "",
    eyebrow: "",
  });
}

function narrativeSection(block: { heading: string; body: string }): PuckInstance {
  return instance("RichText", { content: `## ${block.heading}\n\n${block.body}` });
}

function featuresSection(v: ProductPageVariantContent): PuckInstance {
  const features = v.features.map((item) => ({
    title: item.heading,
    description: item.body,
    icon: "badge-check",
    imageUrl: item.imageUrl ?? null,
  }));
  // Zelfde all-or-nothing-gate als de LP-builder (P7): editorial split alleen
  // wanneer élke feature een beeld heeft; partieel → grid (beelden blijven).
  const hasImages = features.length > 0 && features.every((f) => !!f.imageUrl);
  if (hasImages) return instance("FeatureSplit", { features });
  const columns: "2" | "3" | "4" =
    features.length >= 4 ? "4" : features.length === 2 ? "2" : "3";
  return instance("FeatureGrid", { columns, features });
}

function buildUseCasesSection(v: ProductPageVariantContent): PuckInstance | null {
  if (!v.useCases || v.useCases.length === 0) return null;
  const features = v.useCases.map((useCase) => ({
    title: useCase.heading,
    description: useCase.body,
    icon: "users",
  }));
  const columns: "2" | "3" | "4" = features.length === 2 ? "2" : "3";
  return instance("FeatureGrid", { columns, features });
}

function specsSection(v: ProductPageVariantContent): PuckInstance | null {
  if (!v.specs || v.specs.length === 0) return null;
  // W2 — native SpecTable (2-koloms) i.p.v. de markdown-bullet-workaround.
  return instance("SpecTable", {
    heading: "Specificaties",
    items: v.specs.map((s) => ({ label: s.label, value: s.value })),
  });
}

function processStepsSection(v: ProductPageVariantContent): PuckInstance | null {
  if (!v.processSteps || v.processSteps.length === 0) return null;
  const steps = v.processSteps
    .map((step, i) => `${i + 1}. **${step.heading}** — ${step.body}`)
    .join("\n");
  return instance("RichText", { content: `## Zo werkt het\n\n${steps}` });
}

function pricingSection(v: ProductPageVariantContent): PuckInstance | null {
  if (!v.pricing) return null;
  return instance("RichText", { content: `## ${v.pricing.heading}\n\n${v.pricing.body}` });
}

function finalCtaSection(
  v: ProductPageVariantContent,
  ctx: CanvasContextStack | null,
): PuckInstance {
  const personaId = ctx?.personas?.[0]?.id ?? "";
  // primaryCta === hero.primaryCta (single-CTA discipline, superRefine in schema).
  return instance("BrandCTA", {
    label: v.finalCta.primaryCta,
    href: resolveCtaHref(ctx),
    personaId,
    riskReducer: v.finalCta.body,
    heading: v.finalCta.heading,
  });
}

/**
 * Bouwt een Puck-data-tree uit een gevalideerde ProductPageVariantContent.
 * Verwacht een via productPageVariantSchema gevalideerde variant.
 */
export function buildProductPageTemplateFromStructured(
  rawVariant: ProductPageVariantContent,
  ctx: CanvasContextStack | null,
): SpikeData {
  // W2 beeld-prioriteit: échte ProductImages eerst (HERO→hero, FEATURE/DETAIL/
  // LIFESTYLE→features), dan de brand-image-fallback voor wat nog leeg is.
  const withProductImages = assignProductImagesToVariant(rawVariant, ctx?.products?.[0]?.images ?? null);
  const variant = fillProductBrandImages(withProductImages, ctx?.brandImages ?? null);

  const sections: Array<PuckInstance | null> = [
    heroSection(variant, ctx), // 1. Hero
    narrativeSection(variant.problem), // 2a. Probleem
    narrativeSection(variant.solution), // 2b. Oplossing
    featuresSection(variant), // 3. Features
    buildUseCasesSection(variant), // 4. Use-cases (optional)
    specsSection(variant), // 5. Specs (optional)
    processStepsSection(variant), // 6. Process-stappen (optional)
    pricingSection(variant), // 7. Pricing (optional)
    instance("FAQ", { heading: "Veelgestelde vragen", items: variant.faq }), // 8. FAQ
    finalCtaSection(variant, ctx), // 9. Final CTA
    footerInstance(ctx, taglineFromSubline(variant.hero.subline)),
  ];

  const content = sections.filter((s): s is PuckInstance => s !== null);
  assignSectionBands(content);

  return {
    root: { props: {} },
    content,
  } as SpikeData;
}
