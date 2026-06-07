/**
 * Smoke-test voor contrast-veilige achtergrond-afwisseling tussen secties.
 *
 * 1. sectionBandBg: 'base' = surface; 'alt' = een ANDERE (subtiele) tint;
 *    prefereert een gescrapete secondarySurface bij 'alt'.
 * 2. Alternatie in de builder: de "vlakke" secties (FeatureGrid/FeatureSplit/
 *    RichText/FAQ/PricingTable/StatsBlock) krijgen afwisselend base/alt in
 *    finale volgorde; Hero/Testimonial/CTA/Footer krijgen GEEN bandTone; nooit
 *    twee opeenvolgende deelnemende secties met dezelfde tone.
 * 3. Contrast-garantie: tegen de alt-band blijft body-tekst AA-leesbaar voor een
 *    reeks light/dark surface-fixtures (de renderer resolvet tekst tegen de band).
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase63-section-band-alternation.ts
 */
import { sectionBandBg } from "../../src/features/campaigns/components/canvas/medium/puck-config";
import { buildLandingPageTemplateFromStructured } from "../../src/features/campaigns/components/canvas/medium/puck-templates/landing-page-from-structured";
import { contrastRatio, readableTextColor } from "../../src/lib/landing-pages/wcag";
import { DEFAULT_BRAND_TOKENS, type BrandTokens } from "../../src/lib/landing-pages/brand-tokens";
import type { LandingPageVariantContent } from "../../src/lib/landing-pages/variant-schema";
import type { CanvasContextStack } from "../../src/lib/ai/canvas-context";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}

const tk = (over: Partial<BrandTokens>): BrandTokens => ({ ...DEFAULT_BRAND_TOKENS, ...over });

console.log("\nsectionBandBg");
const light = tk({ surface: "#F4F4F4", onSurface: "#000000", secondarySurface: null });
assert("base → surface", sectionBandBg(light, "base") === "#F4F4F4");
assert("undefined → surface", sectionBandBg(light, undefined) === "#F4F4F4");
assert("alt ≠ surface (er IS een tint)", sectionBandBg(light, "alt") !== "#F4F4F4", sectionBandBg(light, "alt"));
const withSecondary = tk({ surface: "#F5F6F7", onSurface: "#111111", secondarySurface: "#FBF4BC" });
assert("alt prefereert secondarySurface", sectionBandBg(withSecondary, "alt") === "#FBF4BC");

console.log("\nalternatie in builder (deelnemende secties)");
const VARIANT = {
  hero: { headline: "H", subhead: "S", primaryCta: "Go", eyebrow: "" },
  trust: { items: [{ label: "Keurmerk A" }, { label: "Keurmerk B" }] },
  problem: { heading: "P", painBullets: ["a", "b"], bridgingSentence: "c" },
  features: { items: [{ heading: "F1", body: "b1" }, { heading: "F2", body: "b2" }] },
  socialProof: {
    testimonials: [{ quote: "q", authorName: "a", authorRole: "r", outcome: "x" }],
    impactStats: [{ value: "1", label: "l" }],
  },
  faq: { items: [{ question: "q?", answer: "a." }] },
  finalCta: { heading: "Klaar?", primaryCta: "Go", riskReducer: "geen risk" },
} as unknown as LandingPageVariantContent;
const ctx = { brandTokens: light, personas: [], brand: { brandName: "T" }, contentTypeInputs: {} } as unknown as CanvasContextStack;
const tree = buildLandingPageTemplateFromStructured(VARIANT, ctx);
const PARTICIPATING = new Set(["FeatureGrid", "FeatureSplit", "RichText", "FAQ", "PricingTable", "StatsBlock"]);
const seq = tree.content.map((c) => ({ type: c.type, tone: (c.props as Record<string, unknown>).bandTone as string | undefined }));
const participating = seq.filter((s) => PARTICIPATING.has(s.type));
const nonParticipating = seq.filter((s) => !PARTICIPATING.has(s.type));
assert("deelnemende secties hebben een bandTone", participating.every((s) => s.tone === "base" || s.tone === "alt"), JSON.stringify(participating));
assert("Hero/Testimonial/CTA/Footer hebben GEEN bandTone", nonParticipating.every((s) => s.tone === undefined), JSON.stringify(nonParticipating.map((s) => s.type + ":" + s.tone)));
let adjacentOk = true;
for (let i = 1; i < participating.length; i++) if (participating[i].tone === participating[i - 1].tone) adjacentOk = false;
assert("geen twee opeenvolgende deelnemers met zelfde tone", adjacentOk, participating.map((s) => s.tone).join(","));
assert("eerste deelnemer = base", participating[0]?.tone === "base", participating[0]?.tone);

console.log("\ncontrast-garantie op de alt-band (light + dark surfaces)");
const FIXTURES: Array<{ name: string; surface: string; onSurface: string }> = [
  { name: "wit", surface: "#FFFFFF", onSurface: "#111111" },
  { name: "off-white", surface: "#F4F4F4", onSurface: "#000000" },
  { name: "cream", surface: "#FBF8F0", onSurface: "#2A2A2A" },
  { name: "dark", surface: "#121212", onSurface: "#EDEDED" },
  { name: "deep-teal", surface: "#0B1F26", onSurface: "#FFFFFF" },
];
for (const f of FIXTURES) {
  const tokens = tk({ surface: f.surface, onSurface: f.onSurface, secondarySurface: null });
  const altBg = sectionBandBg(tokens, "alt");
  // De renderer resolvet body-tekst tegen de band → simuleer en eis AA (≥4.5).
  const bodyColor = readableTextColor(tokens.onSurface, altBg, tokens.onSurface);
  const ratio = contrastRatio(bodyColor, altBg);
  assert(`${f.name}: alt-band houdt body-tekst AA (${ratio.toFixed(1)}:1)`, ratio >= 4.5, `altBg=${altBg} body=${bodyColor}`);
  // De band moet ZICHTBAAR verschillen van surface (anders geen ritme) maar
  // subtiel blijven (geen jarring sprong).
  const delta = contrastRatio(altBg, tokens.surface);
  assert(`${f.name}: alt-band wijkt zichtbaar maar subtiel af van surface (${delta.toFixed(3)})`, delta > 1.01 && delta < 1.5, `delta=${delta}`);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
