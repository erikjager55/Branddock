/**
 * Smoke-test voor P2 (beeld-producer) + P7 (split-layout-selectie).
 *
 * P2 — assignBrandImagesToVariant / parseBrandImages:
 *  - lege hero + feature-slots → gevuld met brandImages in volgorde
 *  - al-gevulde slots blijven (alleen LEGE slots vullen)
 *  - geen brandImages → no-op
 *  - parseBrandImages tolereert scalar/null/garbage
 * P7 — mapper kiest FeatureSplit wanneer ALLE features beeld dragen, anders
 *  FeatureGrid.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase60-brand-images-split.ts
 */
import { assignBrandImagesToVariant, parseBrandImages } from "../../src/lib/landing-pages/brand-images";
import { buildLandingPageTemplateFromStructured } from "../../src/features/campaigns/components/canvas/medium/puck-templates/landing-page-from-structured";
import type { LandingPageVariantContent } from "../../src/lib/landing-pages/variant-schema";
import type { CanvasContextStack } from "../../src/lib/ai/canvas-context";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}

const baseVariant: LandingPageVariantContent = {
  hero: { headline: "Echte merk-beelden", subhead: "Gevuld uit brandImages.", primaryCta: "Vraag aan" },
  trust: { type: "logos", items: [{ label: "A" }, { label: "B" }, { label: "C" }] },
  features: {
    sectionHeading: "Pilaren",
    items: [
      { icon: "flame", heading: "Een", body: "Eerste." },
      { icon: "shield", heading: "Twee", body: "Tweede." },
      { icon: "leaf", heading: "Drie", body: "Derde." },
    ],
  },
  socialProof: { testimonials: [{ quote: "Top.", authorName: "X", authorRole: "Y", authorCompany: "Z" }] },
  faq: { items: [
    { question: "a?", answer: "a." }, { question: "b?", answer: "b." }, { question: "c?", answer: "c." },
    { question: "d?", answer: "d." }, { question: "e?", answer: "e." },
  ] },
  finalCta: { heading: "Klaar?", riskReducer: "Vrijblijvend.", primaryCta: "Vraag aan" },
};
const clone = (v: LandingPageVariantContent) => JSON.parse(JSON.stringify(v)) as LandingPageVariantContent;
const minimalCtx = { brand: { brandName: "Test" }, personas: [] } as unknown as CanvasContextStack;

console.log("\nP2 — parseBrandImages");
assert("array van {url} → BrandImage[]", parseBrandImages([{ url: "https://x/1.jpg", alt: "a" }]).length === 1);
assert("scalar (null) → []", parseBrandImages(null).length === 0);
assert("string-scalar → []", parseBrandImages("not-array").length === 0);
assert("items zonder url worden geweerd", parseBrandImages([{ alt: "x" }, { url: "" }, { url: "https://x/ok.jpg" }]).length === 1);

console.log("\nP2 — assignBrandImagesToVariant");
{
  const imgs = [{ url: "https://x/hero.jpg" }, { url: "https://x/f1.jpg" }, { url: "https://x/f2.jpg" }, { url: "https://x/f3.jpg" }];
  const out = assignBrandImagesToVariant(clone(baseVariant), imgs);
  assert("hero krijgt eerste image", out.hero.heroVisualUrl === "https://x/hero.jpg");
  assert("feature[0] krijgt 2e image", out.features.items[0].imageUrl === "https://x/f1.jpg");
  assert("feature[2] krijgt 4e image", out.features.items[2].imageUrl === "https://x/f2.jpg" || out.features.items[2].imageUrl === "https://x/f3.jpg");

  // Al-gevulde hero blijft; features krijgen vanaf de eerste image.
  const withHero = clone(baseVariant);
  withHero.hero.heroVisualUrl = "https://x/EXISTING.jpg";
  const out2 = assignBrandImagesToVariant(withHero, imgs);
  assert("bestaande hero-foto blijft (alleen lege slots vullen)", out2.hero.heroVisualUrl === "https://x/EXISTING.jpg");
  assert("feature[0] krijgt dan de EERSTE image", out2.features.items[0].imageUrl === "https://x/hero.jpg");

  // Geen brandImages → no-op.
  const out3 = assignBrandImagesToVariant(clone(baseVariant), null);
  assert("geen brandImages → hero leeg", !out3.hero.heroVisualUrl);
  assert("geen brandImages → features leeg", out3.features.items.every((f) => !f.imageUrl));

  // Input niet gemuteerd.
  const orig = clone(baseVariant);
  assignBrandImagesToVariant(orig, imgs);
  assert("input-variant niet gemuteerd", !orig.hero.heroVisualUrl && orig.features.items.every((f) => !f.imageUrl));
}

console.log("\nP7 — mapper kiest FeatureSplit bij beeld, anders FeatureGrid");
{
  const types = (tree: { content: Array<{ type: string }> }) => tree.content.map((c) => c.type);
  // Zonder beeld → FeatureGrid.
  const noImg = buildLandingPageTemplateFromStructured(clone(baseVariant), minimalCtx);
  assert("geen beeld → FeatureGrid aanwezig", types(noImg).includes("FeatureGrid"));
  assert("geen beeld → géén FeatureSplit", !types(noImg).includes("FeatureSplit"));

  // Met beeld op alle features → FeatureSplit (via brandImages-producer in ctx).
  const ctxImgs = { ...minimalCtx, brandImages: [
    { url: "https://x/h.jpg" }, { url: "https://x/a.jpg" }, { url: "https://x/b.jpg" }, { url: "https://x/c.jpg" },
  ] } as unknown as CanvasContextStack;
  const withImg = buildLandingPageTemplateFromStructured(clone(baseVariant), ctxImgs);
  assert("alle features beeld → FeatureSplit aanwezig", types(withImg).includes("FeatureSplit"));
  assert("FeatureSplit vervangt de feature-FeatureGrid", types(withImg).filter((t) => t === "FeatureGrid").length < types(noImg).filter((t) => t === "FeatureGrid").length);
}

console.log(`\nTotal: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
