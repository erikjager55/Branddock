/**
 * Smoke-test voor V2-1 — Lazy archetype-classification (pure helpers).
 *
 * Test de pure mapping + gating-logica zonder Prisma/Anthropic:
 *  - buildClassifierInputFromBrand: BrandContextBlock → ClassifierInput
 *    field-by-field mapping (incl. archetype legacy-text remap)
 *  - hasSufficientSignalForClassification: skip-gate voor lege brands;
 *    elk individueel signal moet de gate openen
 *
 * De Anthropic + Prisma write-tak wordt afgedekt door integratie via de
 * generate-structured-variant route (browser-smoke / E2E).
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase20-ensure-archetype.ts
 */

import type { BrandContextBlock } from "../../src/lib/ai/prompt-templates";
import {
  buildClassifierInputFromBrand,
  hasSufficientSignalForClassification,
} from "../../src/lib/landing-pages/ensure-archetype";

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

const EMPTY_BRAND: BrandContextBlock = {};

const RICH_BRAND: BrandContextBlock = {
  brandName: "Smoke Brand",
  brandPurpose: "Helpen met testen",
  brandEssence: "Pragmatische helderheid",
  brandPromise: "Werkt eerste keer",
  brandPersonality: "Pragmatisch, helder, no-nonsense",
  brandArchetype: "Sage-leaning",
  brandStory: "Begonnen in 2026...",
  brandValues: ["betrouwbaarheid", "transparantie"],
  industry: "SaaS",
  brandColors: "Teal + slate",
  brandImageryStyle: "Editorial, candid",
  brandToneOfVoice: "Direct, evidence-led",
};

// ─── Mapping tests ─────────────────────────────────────

group("V2-1 — buildClassifierInputFromBrand mapping");
{
  const input = buildClassifierInputFromBrand(RICH_BRAND);
  assert("brandName preserved", input.brandName === "Smoke Brand");
  assert(
    "brandPurpose preserved",
    input.brandPurpose === "Helpen met testen",
  );
  assert(
    "brandEssence preserved",
    input.brandEssence === "Pragmatische helderheid",
  );
  assert("brandPromise preserved", input.brandPromise === "Werkt eerste keer");
  assert(
    "brandPersonality preserved",
    input.brandPersonality === "Pragmatisch, helder, no-nonsense",
  );
  assert(
    "brandArchetype legacy-text → brandArchetypeText",
    input.brandArchetypeText === "Sage-leaning",
  );
  assert("brandStory preserved", input.brandStory === "Begonnen in 2026...");
  assert(
    "brandValues array preserved",
    Array.isArray(input.brandValues) &&
      input.brandValues.length === 2 &&
      input.brandValues[0] === "betrouwbaarheid",
  );
  assert("industry preserved", input.industry === "SaaS");
  assert("brandColors preserved", input.brandColors === "Teal + slate");
  assert(
    "brandImageryStyle preserved",
    input.brandImageryStyle === "Editorial, candid",
  );
  assert(
    "brandToneOfVoice preserved",
    input.brandToneOfVoice === "Direct, evidence-led",
  );
}

group("V2-1 — empty brand → null fields (geen undefined-overhead)");
{
  const input = buildClassifierInputFromBrand(EMPTY_BRAND);
  assert("brandName null", input.brandName === null);
  assert("brandPurpose null", input.brandPurpose === null);
  assert("brandEssence null", input.brandEssence === null);
  assert("brandPromise null", input.brandPromise === null);
  assert("brandPersonality null", input.brandPersonality === null);
  assert("brandArchetypeText null", input.brandArchetypeText === null);
  assert("brandStory null", input.brandStory === null);
  assert("brandValues null", input.brandValues === null);
  assert("industry null", input.industry === null);
  assert("brandColors null", input.brandColors === null);
  assert("brandImageryStyle null", input.brandImageryStyle === null);
  assert("brandToneOfVoice null", input.brandToneOfVoice === null);
}

group("V2-1 — hasSufficientSignalForClassification gate");
{
  // Empty → false
  assert(
    "empty input → false (skip Anthropic)",
    hasSufficientSignalForClassification(
      buildClassifierInputFromBrand(EMPTY_BRAND),
    ) === false,
  );

  // Rich → true
  assert(
    "rich input → true (do classify)",
    hasSufficientSignalForClassification(
      buildClassifierInputFromBrand(RICH_BRAND),
    ) === true,
  );

  // Each individual signal field opens the gate
  const singleSignals: Array<keyof BrandContextBlock> = [
    "brandName",
    "brandPersonality",
    "brandArchetype",
    "brandEssence",
    "brandPurpose",
    "brandPromise",
    "brandStory",
  ];
  for (const field of singleSignals) {
    const brand: BrandContextBlock = { [field]: "x" } as BrandContextBlock;
    const ok = hasSufficientSignalForClassification(
      buildClassifierInputFromBrand(brand),
    );
    assert(`single field ${String(field)} opens gate`, ok === true);
  }

  // brandValues array opens the gate
  const valuesBrand: BrandContextBlock = { brandValues: ["x"] };
  assert(
    "non-empty brandValues array opens gate",
    hasSufficientSignalForClassification(
      buildClassifierInputFromBrand(valuesBrand),
    ) === true,
  );

  // Empty brandValues array does NOT open gate
  const emptyValuesBrand: BrandContextBlock = { brandValues: [] };
  assert(
    "empty brandValues array does not open gate",
    hasSufficientSignalForClassification(
      buildClassifierInputFromBrand(emptyValuesBrand),
    ) === false,
  );

  // Pure visuele fields (kleur/imagery/tone alleen) NIET genoeg — die zijn
  // afgeleid en geven geen archetype-signaal voor verbale classificatie.
  const visualOnlyBrand: BrandContextBlock = {
    brandColors: "Teal",
    brandImageryStyle: "Editorial",
    brandToneOfVoice: "Direct",
  };
  assert(
    "visual-only brand → false (geen verbal signal)",
    hasSufficientSignalForClassification(
      buildClassifierInputFromBrand(visualOnlyBrand),
    ) === false,
  );
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
