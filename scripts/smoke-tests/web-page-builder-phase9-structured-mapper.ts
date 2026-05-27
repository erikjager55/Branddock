/**
 * Smoke-test voor Fase 3 — structured-variant mapper + template-skelet.
 *
 * Verifies:
 *  - buildLandingPageTemplateFromStructured produceert 9-section Puck-tree
 *    voor complete variant (incl. problem + pricing)
 *  - Conditional skip voor problem-sectie wanneer variant.problem undefined
 *  - Conditional skip voor pricing-sectie wanneer variant.pricing undefined
 *  - Beide optionals weggelaten = minimal valid tree
 *  - Multiple testimonials renderen elk als eigen Testimonial-component
 *  - impactStats workaround via FeatureGrid wanneer aanwezig
 *  - Trust-strip workaround via FeatureGrid met logo-labels
 *  - Final CTA gebruikt hero.primaryCta letterlijk (single-CTA discipline)
 *  - Footer companyName komt uit ctx.brand.brandName
 *  - variantToPuckDataFromStructured entry-functie roept template-builder correct aan
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase9-structured-mapper.ts
 */

import { buildLandingPageTemplateFromStructured } from "../../src/features/campaigns/components/canvas/medium/puck-templates/landing-page-from-structured";
import { variantToPuckDataFromStructured } from "../../src/features/campaigns/components/canvas/medium/variant-to-puck-data";
import type { LandingPageVariantContent } from "../../src/lib/landing-pages/variant-schema";
import type { CanvasContextStack } from "../../src/lib/ai/canvas-context";

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`);
    fail++;
  }
}

function group(name: string): void {
  console.log(`\n${name}`);
}

// ─── Fixtures ──────────────────────────────────────────

const completeVariant: LandingPageVariantContent = {
  hero: {
    headline: "Bespaar 5 uur per week",
    subhead: "Voor productteams die snel willen schakelen.",
    primaryCta: "Start mijn proefperiode",
  },
  trust: {
    type: "logos",
    items: [{ label: "Acme" }, { label: "Globex" }, { label: "Initech" }],
  },
  problem: {
    heading: "Verlies je tijd aan repetitief werk?",
    painBullets: [
      "Handmatige rapportages",
      "Vergaderingen zonder agenda",
      "Tools die niet samenwerken",
    ],
    bridgingSentence: "Branddock lost dit op.",
  },
  features: {
    sectionHeading: "Waarom Branddock?",
    items: [
      { icon: "zap", heading: "Snel", body: "In 5 minuten ingericht." },
      { icon: "shield", heading: "Veilig", body: "EU-data, GDPR-conform." },
      { icon: "users", heading: "Samen", body: "Team-features ingebakken." },
    ],
  },
  socialProof: {
    testimonials: [
      {
        quote: "We bespaarden 30 uur per maand.",
        authorName: "Jan Jansen",
        authorRole: "CEO",
        authorCompany: "Voorbeeld BV",
        outcome: "30u/maand",
      },
      {
        quote: "Snelste onboarding ooit.",
        authorName: "Sandra de Vries",
        authorRole: "Marketing Director",
        authorCompany: "Acme NL",
      },
    ],
    impactStats: [
      { value: "10.247", label: "actieve workspaces" },
      { value: "30u", label: "bespaard per maand" },
    ],
  },
  pricing: {
    tiers: [
      { name: "Starter", price: "€19", features: ["feature 1"], highlighted: false },
      {
        name: "Pro",
        price: "€49",
        features: ["feature 1", "feature 2"],
        highlighted: true,
      },
      {
        name: "Enterprise",
        price: "Op maat",
        features: ["feature 1", "feature 2", "feature 3"],
        highlighted: false,
      },
    ],
  },
  faq: {
    items: [
      { question: "Q1?", answer: "A1" },
      { question: "Q2?", answer: "A2" },
      { question: "Q3?", answer: "A3" },
      { question: "Q4?", answer: "A4" },
      { question: "Q5?", answer: "A5" },
    ],
  },
  finalCta: {
    heading: "Klaar?",
    riskReducer: "Geen creditcard nodig.",
    primaryCta: "Start mijn proefperiode",
  },
};

const minimalCtx: CanvasContextStack = {
  brand: { brandName: "Branddock" },
  personas: [{ id: "persona-1", name: "Mara" }],
} as unknown as CanvasContextStack;

function clone(v: LandingPageVariantContent): LandingPageVariantContent {
  return JSON.parse(JSON.stringify(v)) as LandingPageVariantContent;
}

function getTypes(tree: { content: Array<{ type: string }> }): string[] {
  return tree.content.map((c) => c.type);
}

// ─── Tests ─────────────────────────────────────────────

group("Complete variant — 9 anatomie-secties");
{
  const tree = buildLandingPageTemplateFromStructured(completeVariant, minimalCtx);
  const types = getTypes(tree);

  assert("output heeft content-array", Array.isArray(tree.content));
  assert("BrandHero aanwezig (sectie 1)", types.includes("BrandHero"));
  // 2 FeatureGrids (trust-strip + features) + 1 StatsBlock (impactStats kreeg
  // 2026-05-27 dedicated component i.p.v. FeatureGrid-workaround)
  const featureGridCount = types.filter((t) => t === "FeatureGrid").length;
  assert("2 FeatureGrid-instances (trust + features)", featureGridCount === 2);
  assert("StatsBlock aanwezig voor impactStats", types.includes("StatsBlock"));
  // RichText: 1 voor problem + 1 voor risk-reducer
  const richTextCount = types.filter((t) => t === "RichText").length;
  assert("2 RichText-instances (problem + risk-reducer)", richTextCount === 2);
  assert("2 Testimonial-instances", types.filter((t) => t === "Testimonial").length === 2);
  assert("PricingTable aanwezig (sectie 6)", types.includes("PricingTable"));
  assert("FAQ aanwezig (sectie 7)", types.includes("FAQ"));
  assert("BrandCTA aanwezig (sectie 8)", types.includes("BrandCTA"));
  assert("Footer aanwezig", types.includes("Footer"));
}

group("Volgorde-discipline (NN/g attention + Fogg BAT)");
{
  const tree = buildLandingPageTemplateFromStructured(completeVariant, minimalCtx);
  const types = getTypes(tree);
  const heroIdx = types.indexOf("BrandHero");
  const featuresIdx = types.indexOf("FeatureGrid", types.indexOf("FeatureGrid") + 1); // 2e FeatureGrid = features
  const faqIdx = types.indexOf("FAQ");
  const finalCtaIdx = types.indexOf("BrandCTA");
  const footerIdx = types.indexOf("Footer");

  assert("hero komt eerst", heroIdx === 0);
  assert("FAQ komt vóór final CTA", faqIdx < finalCtaIdx);
  assert("BrandCTA komt vóór Footer", finalCtaIdx < footerIdx);
  assert("features komt vóór FAQ", featuresIdx < faqIdx);
}

group("Conditional: problem weggelaten");
{
  const v = clone(completeVariant);
  delete v.problem;
  const tree = buildLandingPageTemplateFromStructured(v, minimalCtx);
  const types = getTypes(tree);
  // 1 RichText minder (problem weg, risk-reducer blijft)
  const richTextCount = types.filter((t) => t === "RichText").length;
  assert("zonder problem: 1 RichText (alleen risk-reducer)", richTextCount === 1);
}

group("Conditional: pricing weggelaten");
{
  const v = clone(completeVariant);
  delete v.pricing;
  const tree = buildLandingPageTemplateFromStructured(v, minimalCtx);
  const types = getTypes(tree);
  assert("zonder pricing: geen PricingTable", !types.includes("PricingTable"));
}

group("Conditional: beide optionals weg");
{
  const v = clone(completeVariant);
  delete v.problem;
  delete v.pricing;
  const tree = buildLandingPageTemplateFromStructured(v, minimalCtx);
  const types = getTypes(tree);
  assert("zonder beide: geen PricingTable", !types.includes("PricingTable"));
  // 1 RichText (risk-reducer only)
  assert(
    "zonder beide: 1 RichText",
    types.filter((t) => t === "RichText").length === 1,
  );
}

group("ImpactStats workaround conditional");
{
  const v = clone(completeVariant);
  delete v.socialProof.impactStats;
  const tree = buildLandingPageTemplateFromStructured(v, minimalCtx);
  const types = getTypes(tree);
  // 2 FeatureGrids: trust + features (impactStats weg)
  const featureGridCount = types.filter((t) => t === "FeatureGrid").length;
  assert("zonder impactStats: 2 FeatureGrids", featureGridCount === 2);
}

group("Single-CTA discipline (§1 #5)");
{
  const tree = buildLandingPageTemplateFromStructured(completeVariant, minimalCtx);
  const hero = tree.content.find((c) => c.type === "BrandHero");
  const finalCta = tree.content.find((c) => c.type === "BrandCTA");

  assert("hero.ctaLabel matcht variant.hero.primaryCta", hero?.props?.ctaLabel === "Start mijn proefperiode");
  assert(
    "finalCta.label matcht variant.finalCta.primaryCta",
    finalCta?.props?.label === "Start mijn proefperiode",
  );
  assert(
    "hero CTA identiek aan final CTA (single-CTA)",
    hero?.props?.ctaLabel === finalCta?.props?.label,
  );
}

group("Multi-testimonial rendering");
{
  const tree = buildLandingPageTemplateFromStructured(completeVariant, minimalCtx);
  const testimonials = tree.content.filter((c) => c.type === "Testimonial");
  assert("2 testimonials in variant → 2 components", testimonials.length === 2);

  const firstAuthor = testimonials[0]?.props?.author as string;
  assert(
    "author bevat name + role + company",
    typeof firstAuthor === "string"
    && firstAuthor.includes("Jan Jansen")
    && firstAuthor.includes("CEO")
    && firstAuthor.includes("Voorbeeld BV"),
  );
  assert("author bevat outcome wanneer aanwezig", firstAuthor.includes("30u/maand"));

  const secondAuthor = testimonials[1]?.props?.author as string;
  assert("tweede author zonder outcome ok", !secondAuthor.includes("—"));
}

group("Trust-strip workaround via FeatureGrid");
{
  const tree = buildLandingPageTemplateFromStructured(completeVariant, minimalCtx);
  // Eerste FeatureGrid = trust-strip
  const firstFg = tree.content.find((c) => c.type === "FeatureGrid");
  const features = firstFg?.props?.features as Array<{ title: string }>;
  assert(
    "trust-FeatureGrid bevat logo-labels",
    features?.length === 3 && features[0].title === "Acme",
  );
}

group("Footer brand-name uit ctx");
{
  const tree = buildLandingPageTemplateFromStructured(completeVariant, minimalCtx);
  const footer = tree.content.find((c) => c.type === "Footer");
  assert("footer companyName = ctx.brand.brandName", footer?.props?.companyName === "Branddock");
}
{
  const tree = buildLandingPageTemplateFromStructured(completeVariant, null);
  const footer = tree.content.find((c) => c.type === "Footer");
  assert("footer companyName fallback bij null ctx", footer?.props?.companyName === "Brand Name");
}

group("variantToPuckDataFromStructured entry-functie");
{
  const tree = variantToPuckDataFromStructured(completeVariant, minimalCtx);
  assert("entry-functie geeft tree", Array.isArray(tree.content) && tree.content.length > 0);
  const types = getTypes(tree);
  assert("entry-functie produceert BrandHero", types.includes("BrandHero"));
}

group("Persona-binding op CTAs");
{
  const tree = buildLandingPageTemplateFromStructured(completeVariant, minimalCtx);
  const finalCta = tree.content.find((c) => c.type === "BrandCTA");
  assert("personaId gebonden uit ctx.personas[0]", finalCta?.props?.personaId === "persona-1");
}
{
  const tree = buildLandingPageTemplateFromStructured(completeVariant, null);
  const finalCta = tree.content.find((c) => c.type === "BrandCTA");
  assert("personaId = '' bij null ctx", finalCta?.props?.personaId === "");
}

// ─── Resultaat ─────────────────────────────────────────

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
console.log("=".repeat(50));

if (fail > 0) {
  process.exit(1);
}
