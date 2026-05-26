/**
 * Landing-page template-builder voor STRUCTURED variants (Fase 3 van
 * docs/specs/web-page-types/landing-page.md §4c).
 *
 * Vervangt heuristic FilledFields-extractie door deterministische
 * 1-op-1 mapping van LandingPageVariantContent → Puck-data-tree.
 * 9-component skelet met conditional rendering voor:
 *   - sectie 3 (problem-articulatie) — alleen als variant.problem aanwezig
 *   - sectie 6 (pricing) — alleen als variant.pricing aanwezig
 *
 * Coëxisteert met legacy buildLandingPageTemplate(filled, ctx) voor
 * markdown-blob deliverables. Wiring beslist welke route gebruikt wordt
 * op basis van of de variant gestructureerd is (Fase 5 integration).
 *
 * Per spec §4a — 3 component-gaps (TrustStrip / PainBullets / ImpactStats)
 * worden v2-werk. MVP-workaround:
 *   - TrustStrip → FeatureGrid met logo-labels als title
 *   - PainBullets → RichText met markdown-bullets
 *   - ImpactStats → optioneel FeatureGrid (4-columns) met stat-values
 */

import type { Data } from "@puckeditor/core";
import type { CanvasContextStack } from "@/lib/ai/canvas-context";
import type { SpikePuckProps } from "../puck-config";
import type { LandingPageVariantContent } from "@/lib/landing-pages/variant-schema";

type SpikeData = Data<SpikePuckProps>;
type PuckInstance = { type: string; props: Record<string, unknown> };

function instance(type: string, props: Record<string, unknown>): PuckInstance {
  return {
    type,
    props: { id: `${type}-${Math.random().toString(36).slice(2, 9)}`, ...props },
  };
}

// ─── Section builders ─────────────────────────────────────

function heroSection(v: LandingPageVariantContent): PuckInstance {
  return instance("BrandHero", {
    headline: v.hero.headline,
    sub: v.hero.subhead,
    ctaLabel: v.hero.primaryCta,
  });
}

function trustStripSection(v: LandingPageVariantContent): PuckInstance {
  // MVP-workaround: FeatureGrid met logo-labels.
  // v2: dedicated TrustStrip-component (spec §4a v2-task).
  const features = v.trust.items.map((item) => ({
    title: item.label,
    description: item.mediaUrl ?? "",
  }));
  const columns: "2" | "3" | "4" =
    features.length >= 4 ? "4" : features.length === 2 ? "2" : "3";
  return instance("FeatureGrid", { columns, features });
}

function problemSection(v: LandingPageVariantContent): PuckInstance | null {
  if (!v.problem) return null;
  const bullets = v.problem.painBullets.map((b) => `- ${b}`).join("\n");
  const content = `## ${v.problem.heading}\n\n${bullets}\n\n${v.problem.bridgingSentence}`;
  return instance("RichText", { content });
}

function featuresSection(v: LandingPageVariantContent): PuckInstance {
  const features = v.features.items.map((item) => ({
    title: item.heading,
    description: item.body,
  }));
  const columns: "2" | "3" | "4" =
    features.length >= 4 ? "4" : features.length === 2 ? "2" : "3";
  return instance("FeatureGrid", { columns, features });
}

function testimonialSections(
  v: LandingPageVariantContent,
  ctx: CanvasContextStack | null,
): PuckInstance[] {
  const personaId = ctx?.personas?.[0]?.id ?? "";
  return v.socialProof.testimonials.map((t) => {
    const authorParts = [t.authorName, t.authorRole, t.authorCompany].filter(Boolean);
    const author = authorParts.join(", ") + (t.outcome ? ` — ${t.outcome}` : "");
    return instance("Testimonial", {
      quote: `"${t.quote}"`,
      author,
      personaId,
    });
  });
}

function impactStatsSection(
  v: LandingPageVariantContent,
): PuckInstance | null {
  if (!v.socialProof.impactStats || v.socialProof.impactStats.length === 0) {
    return null;
  }
  // MVP-workaround: FeatureGrid met value als title.
  // v2: dedicated ImpactStats-component met grote typografie.
  const features = v.socialProof.impactStats.map((s) => ({
    title: s.value,
    description: s.label,
  }));
  const columns: "2" | "3" | "4" =
    features.length >= 4 ? "4" : features.length === 2 ? "2" : "3";
  return instance("FeatureGrid", { columns, features });
}

function pricingSection(v: LandingPageVariantContent): PuckInstance | null {
  if (!v.pricing) return null;
  const tiers = v.pricing.tiers.map((t) => ({
    name: t.name,
    price: t.price,
    features: t.features.join("\n"),
  }));
  return instance("PricingTable", { tiers });
}

function faqSection(v: LandingPageVariantContent): PuckInstance {
  return instance("FAQ", { items: v.faq.items });
}

function finalCtaSection(
  v: LandingPageVariantContent,
  ctx: CanvasContextStack | null,
): PuckInstance {
  const personaId = ctx?.personas?.[0]?.id ?? "";
  // Per spec §1 #5: primaryCta MOET identiek zijn aan hero.primaryCta —
  // afgedwongen via Zod schema cross-field check. Hier vertrouwen we daarop.
  return instance("BrandCTA", {
    label: v.finalCta.primaryCta,
    href: "#",
    personaId,
  });
}

function finalCtaRiskReducerSection(
  v: LandingPageVariantContent,
): PuckInstance {
  // BrandCTA component heeft geen riskReducer slot — workaround via
  // RichText eronder. Spec §4a v2: BrandCTA uitbreiden met optionele
  // riskReducer prop.
  return instance("RichText", {
    content: `**${v.finalCta.heading}**\n\n${v.finalCta.riskReducer}`,
  });
}

function footerSection(
  v: LandingPageVariantContent,
  ctx: CanvasContextStack | null,
): PuckInstance {
  const brandName = ctx?.brand?.brandName ?? "Brand Name";
  return instance("Footer", {
    companyName: brandName,
    // Tagline: gebruik hero.subhead-snippet als footer-tagline
    tagline: v.hero.subhead.slice(0, 80),
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Voorwaarden", href: "/terms" },
      { label: "Contact", href: "/contact" },
    ],
  });
}

// ─── Hoofd-builder ──────────────────────────────────────

/**
 * Bouwt een Puck-data-tree uit een gevalideerde LandingPageVariantContent.
 *
 * 9-component skelet volgens spec §4c. Conditional sections worden
 * weggefilterd via .filter(Boolean) — geen lege RichText/PricingTable
 * componenten in de tree wanneer variant ze niet aanlevert.
 *
 * Verwacht een gevalideerde variant (passed via validateLandingPageVariant).
 * Callers die dit niet doen kunnen een schema-violating tree krijgen.
 */
export function buildLandingPageTemplateFromStructured(
  variant: LandingPageVariantContent,
  ctx: CanvasContextStack | null,
): SpikeData {
  const sections: Array<PuckInstance | null> = [
    heroSection(variant), // 1. Hero
    trustStripSection(variant), // 2. Trust-strip
    problemSection(variant), // 3. Probleem-articulatie (conditional)
    featuresSection(variant), // 4. Features
    ...testimonialSections(variant, ctx), // 5a. Testimonials (1-3)
    impactStatsSection(variant), // 5b. Impact stats (optional)
    pricingSection(variant), // 6. Pricing (conditional)
    faqSection(variant), // 7. FAQ
    finalCtaSection(variant, ctx), // 8a. Final CTA
    finalCtaRiskReducerSection(variant), // 8b. Risk-reducer (workaround)
    footerSection(variant, ctx), // Footer
  ];

  const content = sections.filter((s): s is PuckInstance => s !== null);

  return {
    root: { props: {} },
    content,
  } as SpikeData;
}
