/**
 * FAQ-page template-builder voor STRUCTURED variants (W1, plan
 * docs/specs/website-page-types-implementatieplan.md §3).
 *
 * Deterministische mapping van FaqPageVariantContent → Puck-data-tree:
 *   1. Hero zonder CTA (conversationele titel + subline) — BrandHero skipt
 *      de knop bij lege ctaLabel.
 *   2. Populaire vragen (3-5, hoogste koop-angst-lading) als eerste FAQ-blok.
 *   3. Per categorie een FAQ-blok met de categorie-label als sectiekop
 *      (heading-prop binnen de FAQ-sectie → kop + items op dezelfde band).
 *   4. contactEscape — de NN/g escape-hatch ("Staat je vraag er niet bij?")
 *      als BrandCTA-panel met de body in de riskReducer-slot.
 *   5. closingCta + footer.
 *
 * Geen beeld-secties: een FAQ-pagina is tekst-first (plan §3) — de
 * image-gen-flow wordt client-side voor dit type ge-gate (S5).
 */

import type { Data } from "@puckeditor/core";
import type { CanvasContextStack } from "@/lib/ai/canvas-context";
import type { SpikePuckProps } from "../puck-config";
import type { FaqPageVariantContent } from "@/lib/landing-pages/page-type-schemas";
import { resolveCtaHref, assignSectionBands } from "./landing-page-from-structured";
import { instance, taglineFromSubline, footerInstance, slugifyAnchor, type PuckInstance } from "./from-structured-shared";

type SpikeData = Data<SpikePuckProps>;

/** Categorie-labels → unieke anker-slugs (sectie-volgorde, gededupliceerd). */
function categoryAnchorSlugs(labels: string[]): string[] {
  const seen = new Map<string, number>();
  return labels.map((label, i) => {
    const base = slugifyAnchor(label, `categorie-${i + 1}`);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  });
}

/**
 * Bouwt een Puck-data-tree uit een gevalideerde FaqPageVariantContent.
 * Verwacht een via faqPageVariantSchema gevalideerde variant.
 */
export function buildFaqPageTemplateFromStructured(
  variant: FaqPageVariantContent,
  ctx: CanvasContextStack | null,
): SpikeData {
  const personaId = ctx?.personas?.[0]?.id ?? "";
  const ctaHref = resolveCtaHref(ctx);

  // W3/W4 — categorie-ankernavigatie: bij ≥2 categorieën een sticky AnchorNav
  // met scroll-spy (NN/g §3.1 "alleen bij ≥2 categorieën"). Elke categorie-
  // FAQ-sectie krijgt een anker zodat een lange FAQ-pagina scanbaar blijft.
  const brandName = ctx?.brand?.brandName ?? "Brand Name";
  const categorySlugs = categoryAnchorSlugs(variant.categories.map((c) => c.label));
  const showJumpNav = variant.categories.length >= 2;

  const sections: PuckInstance[] = [
    ...(showJumpNav
      ? [
          instance("AnchorNav", {
            brandName,
            links: variant.categories.map((c, i) => ({ label: c.label, href: `#${categorySlugs[i]}` })),
            ctaLabel: variant.contactEscape.ctaLabel,
            ctaHref,
          }),
        ]
      : []),
    instance("BrandHero", {
      headline: variant.hero.headline,
      sub: variant.hero.subline,
      ctaLabel: "",
      ctaHref: "#",
      heroVisualUrl: "",
      eyebrow: "",
    }),
    instance("FAQ", {
      heading: "Meest gestelde vragen",
      items: variant.popularQuestions,
    }),
    ...variant.categories.map((category, i) =>
      instance("FAQ", { heading: category.label, items: category.items, anchorId: categorySlugs[i] }),
    ),
    instance("BrandCTA", {
      label: variant.contactEscape.ctaLabel,
      href: ctaHref,
      personaId,
      riskReducer: variant.contactEscape.body,
      heading: variant.contactEscape.heading,
    }),
    instance("BrandCTA", {
      label: variant.closingCta.ctaLabel,
      href: ctaHref,
      personaId,
      riskReducer: "",
      heading: variant.closingCta.heading,
    }),
    footerInstance(ctx, taglineFromSubline(variant.hero.subline)),
  ];

  assignSectionBands(sections);

  return {
    root: { props: {} },
    content: sections,
  } as SpikeData;
}
