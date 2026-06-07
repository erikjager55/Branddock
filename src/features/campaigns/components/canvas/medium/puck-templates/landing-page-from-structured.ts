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
import { assignBrandImagesToVariant } from "@/lib/landing-pages/brand-images";

type SpikeData = Data<SpikePuckProps>;
type PuckInstance = { type: string; props: Record<string, unknown> };

function instance(type: string, props: Record<string, unknown>): PuckInstance {
  return {
    type,
    props: { id: `${type}-${Math.random().toString(36).slice(2, 9)}`, ...props },
  };
}

// ─── Section builders ─────────────────────────────────────

/**
 * Bepaalt de CTA-doel-URL uit de Step 1-input `landingPageUrl` ("Where the CTA
 * should link to"). Accepteert http(s)://, root-relatieve paden (/...), en
 * mailto:/tel:. Alles anders (of leeg) → "#" zodat er nooit een kapotte/lekkende
 * URL in een <a href> belandt.
 */
export function resolveCtaHref(ctx: CanvasContextStack | null): string {
  const raw = ctx?.contentTypeInputs?.landingPageUrl;
  const url = typeof raw === "string" ? raw.trim() : "";
  if (!url) return "#";
  if (/^https?:\/\/[^\s]+$/i.test(url)) return url;
  if (/^(?:mailto:|tel:)[^\s]+$/i.test(url)) return url;
  if (/^\/[^\s]*$/.test(url)) return url;
  return "#";
}

function heroSection(v: LandingPageVariantContent, ctx: CanvasContextStack | null): PuckInstance {
  return instance("BrandHero", {
    headline: v.hero.headline,
    sub: v.hero.subhead,
    ctaLabel: v.hero.primaryCta,
    ctaHref: resolveCtaHref(ctx),
    heroVisualUrl: v.hero.heroVisualUrl ?? "",
    eyebrow: v.hero.eyebrow ?? "",
  });
}

function trustStripSection(v: LandingPageVariantContent): PuckInstance {
  // MVP-workaround: FeatureGrid met logo-labels.
  // v2: dedicated TrustStrip-component (spec §4a v2-task).
  // P10: een badge-check-icon geeft de trust-items een herkenbaar credibility-
  // signaal i.p.v. kale tekst (de FeatureGrid rendert anders een lege icon-slot).
  const features = v.trust.items.map((item) => ({
    title: item.label,
    description: item.mediaUrl ?? "",
    icon: "badge-check",
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
    icon: item.icon,
    // Track 2: per-feature beeld doorgeven wanneer de variant het levert.
    imageUrl: item.imageUrl ?? null,
  }));
  // P7: ALLE features beeld → editorial A-B-A-B split-layout (beeld/tekst
  // afwisselend). Bij PARTIËLE vulling (bv. AI-gen 3/4 geslaagd) valt het terug
  // op FeatureGrid — dat rendert per kaart het beeld wanneer aanwezig, anders de
  // icon-badge (Track 2). Zo gaan geslaagde AI-beelden NIET verloren; ze tonen
  // als beeld-kaarten in de grid i.p.v. (lege) split-rijen. all-or-nothing-gate
  // alleen om de editorial split niet met lege beeld-slots te tonen.
  const hasImages = features.length > 0 && features.every((f) => !!f.imageUrl);
  if (hasImages) return instance("FeatureSplit", { features });
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
  // Dedicated StatsBlock-component met brand-emergent dark-bg + display-
  // typography. Renderer kiest archetype-aware dark/light + gebruikt
  // tokens.typographyByRole.display voor de numbers.
  const items = v.socialProof.impactStats.map((s) => ({
    value: s.value,
    label: s.label,
  }));
  return instance("StatsBlock", { items });
}

function pricingSection(v: LandingPageVariantContent): PuckInstance | null {
  if (!v.pricing) return null;
  const tiers = v.pricing.tiers.map((t) => ({
    name: t.name,
    price: t.price,
    features: t.features.join("\n"),
    highlighted: t.highlighted,
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
  // Fase 5: riskReducer is nu native prop op BrandCTA (geen RichText-workaround).
  // Track 4: heading-zin nu óók native prop (IN dezelfde sectie) i.p.v. een losse
  // RichText-sectie erboven → geen dubbele gepadde band meer onderaan.
  return instance("BrandCTA", {
    label: v.finalCta.primaryCta,
    href: resolveCtaHref(ctx),
    personaId,
    riskReducer: v.finalCta.riskReducer,
    heading: v.finalCta.heading,
  });
}

/**
 * Korte, nette footer-tagline. Prefereert de hero-eyebrow (al tagline-achtig);
 * valt anders terug op de eerste zin van de subhead, op woordgrens afgekapt —
 * voorkomt de mid-woord afkapping ("...Jij f") van een naïeve slice(0, 80).
 */
function footerTagline(v: LandingPageVariantContent): string {
  const MAX = 90;
  const eyebrow = v.hero.eyebrow?.trim();
  if (eyebrow && eyebrow.length <= MAX) return eyebrow;
  const firstSentence =
    v.hero.subhead.split(/(?<=[.!?])\s+/)[0]?.trim() ?? v.hero.subhead.trim();
  if (firstSentence.length <= MAX) return firstSentence;
  const cut = firstSentence.slice(0, MAX);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

function footerSection(
  v: LandingPageVariantContent,
  ctx: CanvasContextStack | null,
): PuckInstance {
  const brandName = ctx?.brand?.brandName ?? "Brand Name";
  return instance("Footer", {
    companyName: brandName,
    tagline: footerTagline(v),
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
  rawVariant: LandingPageVariantContent,
  ctx: CanvasContextStack | null,
): SpikeData {
  // P2 — vul lege hero/feature-beeld-slots met de brand-eigen brandImages
  // (merken mét bronbeeld krijgen echte foto's; zonder bronbeeld is dit een
  // no-op en blijven de slots leeg / vallen op placeholder/AI-gen terug).
  const variant = assignBrandImagesToVariant(rawVariant, ctx?.brandImages ?? null);
  const sections: Array<PuckInstance | null> = [
    heroSection(variant, ctx), // 1. Hero
    trustStripSection(variant), // 2. Trust-strip
    problemSection(variant), // 3. Probleem-articulatie (conditional)
    featuresSection(variant), // 4. Features
    ...testimonialSections(variant, ctx), // 5a. Testimonials (1-3)
    impactStatsSection(variant), // 5b. Impact stats (optional)
    pricingSection(variant), // 6. Pricing (conditional)
    faqSection(variant), // 7. FAQ
    finalCtaSection(variant, ctx), // 8. Final CTA (heading + riskReducer, één sectie)
    footerSection(variant, ctx), // Footer
  ];

  const content = sections.filter((s): s is PuckInstance => s !== null);

  return {
    root: { props: {} },
    content,
  } as SpikeData;
}
