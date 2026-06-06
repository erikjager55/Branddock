/**
 * Smoke-test voor Track 2 — per-feature beeld (feature-card images).
 *
 * Verifies:
 *  - featureItemSchema accepteert een item MET geldige imageUrl
 *  - featureItemSchema accepteert een item ZONDER imageUrl (optioneel)
 *  - featureItemSchema WEIGERT een ongeldige imageUrl (geen URL)
 *  - imageUrl: null valideert (nullable)
 *  - buildLandingPageTemplateFromStructured threadt item.imageUrl door naar
 *    de FeatureGrid-instance props (per-feature)
 *  - Een item zonder imageUrl threadt expliciet `null` (geen undefined-lek)
 *
 * De daadwerkelijke <img>-render in puck-config FeatureGrid is React-JSX
 * (door tsc geverifieerd: f.imageUrl ? <img> : icon-badge); deze smoke dekt
 * het data-contract (schema + mapper-threading), de testbare laag.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase56-feature-images.ts
 */

import { buildLandingPageTemplateFromStructured } from "../../src/features/campaigns/components/canvas/medium/puck-templates/landing-page-from-structured";
import { validateLandingPageVariant } from "../../src/lib/landing-pages/variant-schema";
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

const minimalCtx: CanvasContextStack = {
  brand: { brandName: "Zwarthout" },
  personas: [],
} as unknown as CanvasContextStack;

// Schema-volledige variant; feature #1 met beeld, #2/#3 zonder.
const baseVariant: LandingPageVariantContent = {
  hero: {
    headline: "Verkoold gevelhout dat een leven lang zwart blijft",
    subhead: "Shou Sugi Ban: door vuur behandeld, onderhoudsvrij en weerbestendig.",
    primaryCta: "Vraag houtstalen aan",
  },
  trust: {
    type: "logos",
    items: [{ label: "ORGA" }, { label: "Natrufied" }, { label: "FSC" }],
  },
  features: {
    sectionHeading: "Waarom verkoold hout",
    items: [
      {
        icon: "flame",
        heading: "Onderhoudsvrij",
        body: "Het vuur sluit het oppervlak; geen schilderen, geen rot.",
        imageUrl: "https://cdn.example.com/material/char-macro.jpg",
      },
      {
        icon: "shield",
        heading: "Brandvertragend",
        body: "Brandklasse B-s1,d0 voor hoogbouw-eisen.",
      },
      {
        icon: "leaf",
        heading: "Circulair",
        body: "Cradle-to-Cradle, FSC-gecertificeerd hout.",
      },
    ],
  },
  socialProof: {
    testimonials: [
      {
        quote: "De gevel is na zes jaar nog gitzwart, zonder één onderhoudsbeurt.",
        authorName: "Bram de Vries",
        authorRole: "Architect",
        authorCompany: "ORGA Architect",
        outcome: "0 onderhoud in 6 jaar",
      },
    ],
  },
  faq: {
    items: [
      { question: "Wat is de levertijd?", answer: "Op maat geproduceerd, plan tijdig in." },
      { question: "Welke brandklasse?", answer: "B-s1,d0, geschikt voor hoogbouw." },
      { question: "Hoe monteer ik de delen?", answer: "Met blinde bevestiging op regelwerk." },
      { question: "Wat kost het per m²?", answer: "Afhankelijk van houtsoort en afwerking." },
      { question: "Is het circulair?", answer: "Ja, FSC-hout en Cradle-to-Cradle." },
    ],
  },
  finalCta: {
    heading: "Klaar voor een zwarte gevel?",
    riskReducer: "Gratis stalen + advies binnen 2 werkdagen.",
    primaryCta: "Vraag houtstalen aan",
  },
};

function clone(v: LandingPageVariantContent): LandingPageVariantContent {
  return JSON.parse(JSON.stringify(v)) as LandingPageVariantContent;
}

type FeatureProps = {
  features?: Array<{ title: string; imageUrl?: string | null }>;
};

function featureGridItems(
  tree: { content: Array<{ type: string; props?: unknown }> },
): Array<{ title: string; imageUrl?: string | null }> {
  // De feature-FeatureGrid is degene wiens items de bekende heading dragen
  // (trust-strip rendert óók als FeatureGrid maar met logo-labels).
  const grids = tree.content.filter((c) => c.type === "FeatureGrid");
  for (const g of grids) {
    const items = (g.props as FeatureProps)?.features ?? [];
    if (items.some((it) => it.title === "Onderhoudsvrij")) return items;
  }
  return [];
}

// ─── Tests ─────────────────────────────────────────────

group("Schema — imageUrl optioneel + URL-gevalideerd");
{
  const ok = validateLandingPageVariant(clone(baseVariant));
  assert("variant MET imageUrl valideert", ok.success === true, ok.success ? "" : JSON.stringify(ok.errors.slice(0, 2)));

  const noImg = clone(baseVariant);
  delete (noImg.features.items[0] as { imageUrl?: unknown }).imageUrl;
  const okNoImg = validateLandingPageVariant(noImg);
  assert("variant ZONDER imageUrl valideert (optioneel)", okNoImg.success === true);

  const badImg = clone(baseVariant);
  (badImg.features.items[0] as { imageUrl?: unknown }).imageUrl = "not-a-url";
  const okBad = validateLandingPageVariant(badImg);
  assert("ongeldige imageUrl wordt geweigerd", okBad.success === false);

  const nullImg = clone(baseVariant);
  (nullImg.features.items[0] as { imageUrl?: unknown }).imageUrl = null;
  const okNull = validateLandingPageVariant(nullImg);
  assert("imageUrl: null valideert (nullable)", okNull.success === true);
}

group("Mapper — imageUrl per-feature doorgegeven naar FeatureGrid");
{
  const tree = buildLandingPageTemplateFromStructured(baseVariant, minimalCtx);
  const items = featureGridItems(tree);
  assert("feature-FeatureGrid gevonden met 3 items", items.length === 3, `n=${items.length}`);
  assert(
    "item #1 draagt de imageUrl door",
    items[0]?.imageUrl === "https://cdn.example.com/material/char-macro.jpg",
    String(items[0]?.imageUrl),
  );
  assert("item #2 (geen beeld) → null, geen undefined-lek", items[1]?.imageUrl === null, String(items[1]?.imageUrl));
  assert("item #3 (geen beeld) → null", items[2]?.imageUrl === null, String(items[2]?.imageUrl));
}

console.log(`\nTotal: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
