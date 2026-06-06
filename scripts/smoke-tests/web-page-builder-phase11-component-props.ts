/**
 * Smoke-test voor Fase 5 — component prop-uitbreidingen + structured-mapper round-trip.
 *
 * Verifies (additive, backward-compat):
 *  - BrandHero accepteert heroVisualUrl (optional)
 *  - BrandCTA accepteert riskReducer (optional)
 *  - FeatureItem accepteert icon (optional)
 *  - PricingTier accepteert highlighted (optional)
 *  - structured-mapper geeft icon door van variant.features.items[].icon
 *  - structured-mapper geeft highlighted door van variant.pricing.tiers[].highlighted
 *  - structured-mapper gebruikt nieuwe riskReducer-prop op BrandCTA
 *    (geen losse RichText-workaround meer)
 *  - Final-CTA-heading wordt als RichText boven BrandCTA gerendered
 *  - Bestaande tree-shapes zonder nieuwe props blijven werken (backward-compat)
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase11-component-props.ts
 */

import { buildLandingPageTemplateFromStructured } from "../../src/features/campaigns/components/canvas/medium/puck-templates/landing-page-from-structured";
import { buildSpikePuckConfig } from "../../src/features/campaigns/components/canvas/medium/puck-config";
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
    headline: "Bespaar 5 uur",
    subhead: "Voor productteams die snel willen schakelen.",
    primaryCta: "Start mijn proefperiode",
  },
  trust: {
    type: "logos",
    items: [{ label: "Acme" }, { label: "Globex" }],
  },
  features: {
    sectionHeading: "Waarom",
    items: [
      { icon: "zap", heading: "Snel", body: "In 5 minuten ingericht." },
      { icon: "shield", heading: "Veilig", body: "GDPR-conform." },
      { icon: "users", heading: "Samen", body: "Team-features." },
    ],
  },
  socialProof: {
    testimonials: [
      {
        quote: "Top product",
        authorName: "Jan",
        authorRole: "CEO",
        authorCompany: "BV",
      },
    ],
  },
  pricing: {
    tiers: [
      { name: "Starter", price: "€19", features: ["f1"], highlighted: false },
      { name: "Pro", price: "€49", features: ["f1", "f2"], highlighted: true },
      { name: "Enterprise", price: "Op maat", features: ["f1"], highlighted: false },
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
    heading: "Klaar om te beginnen?",
    riskReducer: "Geen creditcard nodig.",
    primaryCta: "Start mijn proefperiode",
  },
};

const ctx: CanvasContextStack = {
  brand: { brandName: "Branddock" },
  personas: [{ id: "p1", name: "Mara" }],
} as unknown as CanvasContextStack;

// ─── Tests ─────────────────────────────────────────────

group("Puck-config — nieuwe fields aanwezig");
{
  const config = buildSpikePuckConfig(ctx);

  const heroFields = (config.components.BrandHero as { fields: Record<string, unknown> }).fields;
  assert("BrandHero.fields.heroVisualUrl gedefinieerd", "heroVisualUrl" in heroFields);

  const ctaFields = (config.components.BrandCTA as { fields: Record<string, unknown> }).fields;
  assert("BrandCTA.fields.riskReducer gedefinieerd", "riskReducer" in ctaFields);

  type FeatureGridConfig = {
    fields: { features: { arrayFields: Record<string, unknown> } };
  };
  const featureGridArrayFields = (config.components.FeatureGrid as FeatureGridConfig).fields
    .features.arrayFields;
  assert("FeatureGrid features.icon gedefinieerd", "icon" in featureGridArrayFields);

  type PricingTableConfig = {
    fields: { tiers: { arrayFields: Record<string, unknown> } };
  };
  const pricingArrayFields = (config.components.PricingTable as PricingTableConfig).fields
    .tiers.arrayFields;
  assert("PricingTable tiers.highlighted gedefinieerd", "highlighted" in pricingArrayFields);
}

group("Default props zijn backward-compat (optional defaults)");
{
  const config = buildSpikePuckConfig(ctx);
  const heroDefaults = (config.components.BrandHero as { defaultProps: Record<string, unknown> })
    .defaultProps;
  assert("BrandHero.defaultProps heeft heroVisualUrl=''", heroDefaults.heroVisualUrl === "");

  const ctaDefaults = (config.components.BrandCTA as { defaultProps: Record<string, unknown> })
    .defaultProps;
  assert("BrandCTA.defaultProps heeft riskReducer=''", ctaDefaults.riskReducer === "");

  type FeatureGridDefaults = {
    defaultProps: { features: Array<{ icon?: string }> };
  };
  const featureGridDefaults = (config.components.FeatureGrid as FeatureGridDefaults).defaultProps;
  assert(
    "FeatureGrid defaults.features[0].icon defined",
    typeof featureGridDefaults.features[0].icon === "string",
  );

  type PricingDefaults = {
    defaultProps: { tiers: Array<{ highlighted?: boolean }> };
  };
  const pricingDefaults = (config.components.PricingTable as PricingDefaults).defaultProps;
  assert(
    "PricingTable defaults.tiers[0].highlighted defined",
    typeof pricingDefaults.tiers[0].highlighted === "boolean",
  );
  assert(
    "PricingTable defaults middle-tier highlighted=true (decoy)",
    pricingDefaults.tiers[1]?.highlighted === true,
  );
}

group("Structured-mapper: icon doorgegeven");
{
  const tree = buildLandingPageTemplateFromStructured(completeVariant, ctx);
  const featureGrids = tree.content.filter((c) => c.type === "FeatureGrid");
  // 2 FeatureGrids: trust + features. Features = 2e instance.
  const featuresFg = featureGrids[1] as { props: { features: Array<{ icon?: string }> } };
  assert(
    "features-FeatureGrid item 0 heeft icon='zap'",
    featuresFg.props.features[0]?.icon === "zap",
  );
  assert(
    "features-FeatureGrid item 1 heeft icon='shield'",
    featuresFg.props.features[1]?.icon === "shield",
  );
  assert(
    "features-FeatureGrid item 2 heeft icon='users'",
    featuresFg.props.features[2]?.icon === "users",
  );
}

group("Structured-mapper: highlighted doorgegeven");
{
  const tree = buildLandingPageTemplateFromStructured(completeVariant, ctx);
  const pricing = tree.content.find((c) => c.type === "PricingTable") as {
    props: { tiers: Array<{ highlighted?: boolean; name?: string }> };
  };
  const tiers = pricing.props.tiers;
  assert("Starter highlighted=false", tiers[0].highlighted === false);
  assert("Pro highlighted=true (decoy-middle)", tiers[1].highlighted === true);
  assert("Enterprise highlighted=false", tiers[2].highlighted === false);
}

group("Structured-mapper: riskReducer als BrandCTA-prop");
{
  const tree = buildLandingPageTemplateFromStructured(completeVariant, ctx);
  const cta = tree.content.find((c) => c.type === "BrandCTA") as {
    props: { riskReducer?: string };
  };
  assert(
    "BrandCTA.riskReducer = variant.finalCta.riskReducer",
    cta.props.riskReducer === "Geen creditcard nodig.",
  );
}

group("Structured-mapper: final-CTA-heading als BrandCTA-prop (Track 4)");
{
  const tree = buildLandingPageTemplateFromStructured(completeVariant, ctx);
  // Track 4: heading-zin is nu een native BrandCTA-prop IN dezelfde sectie —
  // geen losse final-CTA-heading RichText meer (geen dubbele gepadde band).
  const cta = tree.content.find((c) => c.type === "BrandCTA") as {
    props: { heading?: string };
  };
  assert(
    "BrandCTA.heading bevat finalCta.heading",
    cta.props.heading?.includes("Klaar om te beginnen?") ?? false,
  );
  // problem niet aanwezig in fixture → geen final-CTA RichText meer → 0 RichTexts.
  const richTexts = tree.content.filter((c) => c.type === "RichText");
  assert("geen losse final-CTA-heading RichText meer", richTexts.length === 0, `n=${richTexts.length}`);
}

group("Volgorde: BrandCTA → Footer");
{
  const tree = buildLandingPageTemplateFromStructured(completeVariant, ctx);
  const types = tree.content.map((c) => c.type);
  const ctaIdx = types.indexOf("BrandCTA");
  const footerIdx = types.indexOf("Footer");

  assert("BrandCTA komt vóór Footer", ctaIdx >= 0 && ctaIdx < footerIdx);
  assert("Footer is laatste", footerIdx === types.length - 1);
}

group("Backward-compat: variant zonder icon op feature");
{
  const v = JSON.parse(JSON.stringify(completeVariant)) as LandingPageVariantContent;
  // Per schema is icon required string min(1) — kan niet weg. We testen
  // alleen dat de mapper geen crash geeft bij minimale icon-waarde.
  v.features.items[0].icon = "x";
  const tree = buildLandingPageTemplateFromStructured(v, ctx);
  const featureGrids = tree.content.filter((c) => c.type === "FeatureGrid");
  const featuresFg = featureGrids[1] as { props: { features: Array<{ icon?: string }> } };
  assert("kort icon-name werkt", featuresFg.props.features[0].icon === "x");
}

// ─── Resultaat ─────────────────────────────────────────

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
console.log("=".repeat(50));

if (fail > 0) {
  process.exit(1);
}
