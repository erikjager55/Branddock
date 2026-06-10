/**
 * Smoke-test voor Fase 1 (Phase 7 in worktree-volgorde) — landing-page
 * variant schema Zod-validator.
 *
 * Verifies validateLandingPageVariant():
 *  - Complete variant met alle 8 secties + optionals (problem, pricing) valideert
 *  - Variant zonder problem valideert (optional)
 *  - Variant zonder pricing valideert (optional)
 *  - Variant zonder beide optionals valideert
 *  - headline >44 chars rejects met juiste error-path
 *  - features <3 of >5 items rejects (paradox of choice)
 *  - testimonials <1 of >3 items rejects
 *  - faq <5 of >8 items rejects (objection-coverage)
 *  - pricing != 3 tiers rejects (decoy-effect)
 *  - problem.painBullets <3 of >5 rejects
 *  - trust.items >7 rejects
 *  - Cross-field: finalCta.primaryCta != hero.primaryCta rejects (single-CTA)
 *  - Leeg/garbage input geeft duidelijke errors
 *  - Niet-string input op string-field rejects
 *
 * No DB, no AI, pure schema validation.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase7-variant-schema.ts
 */

import {
  validateLandingPageVariant,
  type LandingPageVariantContent,
} from "../../src/lib/landing-pages/variant-schema";

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
    bridgingSentence: "Branddock lost dit op door context-stack.",
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
        outcome: "30 uur per maand bespaard",
      },
    ],
  },
  pricing: {
    tiers: [
      {
        name: "Starter",
        price: "€19",
        features: ["1 workspace", "Email support"],
        highlighted: false,
      },
      {
        name: "Pro",
        price: "€49",
        features: ["5 workspaces", "Priority support", "Brand voice"],
        highlighted: true,
      },
      {
        name: "Enterprise",
        price: "Op maat",
        features: ["Unlimited", "Dedicated support", "SSO"],
        highlighted: false,
      },
    ],
  },
  faq: {
    items: [
      { question: "Hoe lang duurt setup?", answer: "Minder dan 1 dag." },
      { question: "Kan ik altijd weg?", answer: "Ja, maandelijks opzegbaar." },
      { question: "Hoe veilig is mijn data?", answer: "Encryptie in transit en rust." },
      { question: "Welke integraties?", answer: "Slack, Notion, Linear." },
      { question: "Is er een trial?", answer: "Ja, 14 dagen gratis." },
    ],
  },
  finalCta: {
    heading: "Klaar om te beginnen?",
    riskReducer: "Geen creditcard nodig.",
    primaryCta: "Start mijn proefperiode",
  },
};

function clone(v: LandingPageVariantContent): LandingPageVariantContent {
  return JSON.parse(JSON.stringify(v)) as LandingPageVariantContent;
}

// ─── Tests ─────────────────────────────────────────────

group("Compleet + optionals");
{
  const result = validateLandingPageVariant(completeVariant);
  assert("complete variant met problem + pricing valideert", result.success);
  if (!result.success) {
    console.error("    errors:", JSON.stringify(result.errors, null, 2));
  }
}
{
  const v = clone(completeVariant);
  delete (v as Partial<LandingPageVariantContent>).problem;
  const result = validateLandingPageVariant(v);
  assert("variant zonder optional problem valideert", result.success);
}
{
  const v = clone(completeVariant);
  delete (v as Partial<LandingPageVariantContent>).pricing;
  const result = validateLandingPageVariant(v);
  assert("variant zonder optional pricing valideert", result.success);
}
{
  const v = clone(completeVariant);
  delete (v as Partial<LandingPageVariantContent>).problem;
  delete (v as Partial<LandingPageVariantContent>).pricing;
  const result = validateLandingPageVariant(v);
  assert("variant zonder beide optionals valideert", result.success);
}

group("Hero constraints");
{
  const v = clone(completeVariant);
  v.hero.headline = "Dit is een veel te lange headline die ver boven de 44 tekens uitkomt en dus moet falen";
  const result = validateLandingPageVariant(v);
  assert("headline >44 chars rejects", !result.success);
  if (!result.success) {
    const hasHeadlineError = result.errors.some((e) =>
      e.path.includes("hero") && e.path.includes("headline"),
    );
    assert("  error path bevat hero.headline", hasHeadlineError);
  }
}
{
  const v = clone(completeVariant);
  v.hero.headline = "";
  const result = validateLandingPageVariant(v);
  assert("hero.headline leeg rejects", !result.success);
}

group("Features paradox-of-choice (3-5 items)");
{
  const v = clone(completeVariant);
  v.features.items = v.features.items.slice(0, 2);
  const result = validateLandingPageVariant(v);
  assert("features <3 items rejects", !result.success);
}
{
  const v = clone(completeVariant);
  const sample = v.features.items[0];
  v.features.items = [sample, sample, sample, sample, sample, sample];
  const result = validateLandingPageVariant(v);
  assert("features >5 items rejects", !result.success);
}
{
  const v = clone(completeVariant);
  v.features.items = [v.features.items[0], v.features.items[1], v.features.items[2], v.features.items[0]];
  const result = validateLandingPageVariant(v);
  assert("features 4 items valideert (binnen 3-5 range)", result.success);
}

group("Testimonials (1-3 items)");
{
  const v = clone(completeVariant);
  v.socialProof.testimonials = [];
  const result = validateLandingPageVariant(v);
  assert("testimonials 0 rejects", !result.success);
}
{
  const v = clone(completeVariant);
  const t = v.socialProof.testimonials[0];
  v.socialProof.testimonials = [t, t, t, t];
  const result = validateLandingPageVariant(v);
  assert("testimonials 4 rejects", !result.success);
}

group("FAQ objection-coverage (5-8 items)");
{
  const v = clone(completeVariant);
  v.faq.items = v.faq.items.slice(0, 4);
  const result = validateLandingPageVariant(v);
  assert("faq <5 items rejects", !result.success);
}
{
  const v = clone(completeVariant);
  const q = v.faq.items[0];
  v.faq.items = [q, q, q, q, q, q, q, q, q];
  const result = validateLandingPageVariant(v);
  assert("faq >8 items rejects", !result.success);
}

group("Pricing decoy-effect (exact 3 tiers)");
{
  const v = clone(completeVariant);
  v.pricing!.tiers = v.pricing!.tiers.slice(0, 2);
  const result = validateLandingPageVariant(v);
  assert("pricing 2 tiers rejects (niet exact 3)", !result.success);
}
{
  const v = clone(completeVariant);
  v.pricing!.tiers = [...v.pricing!.tiers, v.pricing!.tiers[0]];
  const result = validateLandingPageVariant(v);
  assert("pricing 4 tiers rejects (niet exact 3)", !result.success);
}

group("Problem painBullets (3-5)");
{
  const v = clone(completeVariant);
  v.problem!.painBullets = ["alleen 1", "en 2"];
  const result = validateLandingPageVariant(v);
  assert("problem.painBullets <3 rejects", !result.success);
}
{
  const v = clone(completeVariant);
  v.problem!.painBullets = ["1", "2", "3", "4", "5", "6"];
  const result = validateLandingPageVariant(v);
  assert("problem.painBullets >5 rejects", !result.success);
}

group("Trust items (1-7)");
{
  const v = clone(completeVariant);
  v.trust.items = [];
  const result = validateLandingPageVariant(v);
  assert("trust.items 0 rejects", !result.success);
}
{
  const v = clone(completeVariant);
  const item = v.trust.items[0];
  v.trust.items = [item, item, item, item, item, item, item, item];
  const result = validateLandingPageVariant(v);
  assert("trust.items >7 rejects", !result.success);
}

group("Cross-field: finalCta.primaryCta == hero.primaryCta");
{
  const v = clone(completeVariant);
  v.finalCta.primaryCta = "Andere CTA tekst";
  const result = validateLandingPageVariant(v);
  assert("finalCta.primaryCta verschilt van hero.primaryCta rejects", !result.success);
  if (!result.success) {
    const hasCrossFieldError = result.errors.some(
      (e) => e.path === "finalCta.primaryCta" && /single-CTA/.test(e.message),
    );
    assert("  cross-field error vermeldt single-CTA discipline", hasCrossFieldError);
  }
}

group("ImageBrief (R7, audit 2026-06-10) — optioneel + gevalideerd");
{
  // Zonder imageBrief blijft alles geldig (backwards-compat met persisted variants).
  const without = clone(completeVariant);
  assert("variant zónder imageBrief valide", validateLandingPageVariant(without).success);

  // Met geldige briefs op hero + features.
  const withBriefs = clone(completeVariant);
  (withBriefs.hero as Record<string, unknown>).imageBrief = {
    subject: "Lichte restaurantzaal met gedekte tafels en gestreken linnen",
    sceneType: "location",
    composition: "breed overzicht, natuurlijk licht, negatieve ruimte links",
  };
  (withBriefs.features.items[0] as Record<string, unknown>).imageBrief = {
    subject: "Stapel gevouwen servetten met GOTS-certificaatlabel",
    sceneType: "detail",
    composition: "macro close-up, zachte zijbelichting",
    avoid: "personen frontaal in beeld",
  };
  assert("variant mét geldige imageBriefs valide", validateLandingPageVariant(withBriefs).success);

  // Ongeldige sceneType faalt.
  const badScene = clone(completeVariant);
  (badScene.features.items[0] as Record<string, unknown>).imageBrief = {
    subject: "X",
    sceneType: "portrait",
    composition: "Y",
  };
  const badResult = validateLandingPageVariant(badScene);
  assert("ongeldige sceneType rejects", !badResult.success);

  // null-brief expliciet toegestaan (LLM mag null retourneren).
  const nullBrief = clone(completeVariant);
  (nullBrief.hero as Record<string, unknown>).imageBrief = null;
  assert("imageBrief null valide", validateLandingPageVariant(nullBrief).success);
}

group("Edge cases");
{
  const result = validateLandingPageVariant({});
  assert("leeg object rejects", !result.success);
  if (!result.success) {
    assert("  meerdere errors gerapporteerd", result.errors.length >= 5);
  }
}
{
  const result = validateLandingPageVariant(null);
  assert("null rejects", !result.success);
}
{
  const result = validateLandingPageVariant("een string");
  assert("string rejects", !result.success);
}
{
  const v = clone(completeVariant) as unknown as Record<string, unknown>;
  v.hero = "niet een object";
  const result = validateLandingPageVariant(v);
  assert("hero als string rejects", !result.success);
}

// ─── Resultaat ─────────────────────────────────────────

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
console.log("=".repeat(50));

if (fail > 0) {
  process.exit(1);
}
