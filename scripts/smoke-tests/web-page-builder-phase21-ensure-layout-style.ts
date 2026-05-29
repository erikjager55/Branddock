/**
 * Smoke-test voor V2-2 — Lazy LayoutStyle-inference (pure helper).
 *
 * Test de pure mapping zonder Prisma:
 *  - inferLayoutStyleFromBrand: archetype null → null
 *  - Elk archetype geeft base layoutStyle bij neutrale tone
 *  - Tone-nudges werken:
 *    - HERO + premium → MINIMAL (i.p.v. base COMMERCIAL)
 *    - OUTLAW + refined → MINIMAL
 *    - SAGE + scannable → COMMERCIAL (i.p.v. base EDITORIAL)
 *    - CREATOR + storytelling → EXPERIENTIAL
 *    - INNOCENT + refined → MINIMAL
 *    - REGULAR_GUY + intimate → PLAYFUL
 *    - LOVER + refined → EDITORIAL
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase21-ensure-layout-style.ts
 */

import type { BrandContextBlock } from "../../src/lib/ai/prompt-templates";
import type { BrandArchetype } from "../../src/lib/landing-pages/brand-archetype-classifier";
import { inferLayoutStyleFromBrand } from "../../src/lib/landing-pages/ensure-layout-style";

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

const NEUTRAL_BRAND: BrandContextBlock = {};

// ─── No archetype → null ─────────────────────────────────

group("V2-2 — null archetype returnt null (geen sensible default mogelijk)");
{
  const result = inferLayoutStyleFromBrand(null, NEUTRAL_BRAND);
  assert("null archetype → null result", result === null);
}

// ─── Base mapping per archetype ──────────────────────────

group("V2-2 — base mapping per archetype (neutrale tone)");
{
  const cases: Array<{ archetype: BrandArchetype; expected: string }> = [
    { archetype: "RULER", expected: "MINIMAL" },
    { archetype: "SAGE", expected: "EDITORIAL" },
    { archetype: "MAGICIAN", expected: "EXPERIENTIAL" },
    { archetype: "CREATOR", expected: "EDITORIAL" },
    { archetype: "LOVER", expected: "EXPERIENTIAL" },
    { archetype: "EXPLORER", expected: "EXPERIENTIAL" },
    { archetype: "HERO", expected: "COMMERCIAL" },
    { archetype: "OUTLAW", expected: "COMMERCIAL" },
    { archetype: "INNOCENT", expected: "PLAYFUL" },
    { archetype: "JESTER", expected: "PLAYFUL" },
    { archetype: "REGULAR_GUY", expected: "COMMERCIAL" },
    { archetype: "CARETAKER", expected: "PLAYFUL" },
  ];
  for (const { archetype, expected } of cases) {
    const result = inferLayoutStyleFromBrand(archetype, NEUTRAL_BRAND);
    assert(
      `${archetype} → ${expected}`,
      result?.layoutStyle === expected,
      `got ${result?.layoutStyle}`,
    );
    assert(
      `${archetype} confidence high (neutral, base mapping)`,
      result?.confidence === "high",
    );
  }
}

// ─── Tone-nudges ─────────────────────────────────────────

group("V2-2 — HERO + premium → MINIMAL (i.p.v. base COMMERCIAL)");
{
  const result = inferLayoutStyleFromBrand("HERO", {
    brandToneOfVoice: "Premium en authoritative",
  });
  assert("HERO premium → MINIMAL", result?.layoutStyle === "MINIMAL");
  assert("nudge confidence medium", result?.confidence === "medium");
  assert(
    "reasoning bevat premium-uitleg",
    (result?.reasoning ?? "").toLowerCase().includes("premium") ||
      (result?.reasoning ?? "").toLowerCase().includes("refined"),
  );
}

group("V2-2 — OUTLAW + refined → MINIMAL");
{
  const result = inferLayoutStyleFromBrand("OUTLAW", {
    brandPersonality: "Refined rebellion, sophisticated craft",
  });
  assert("OUTLAW refined → MINIMAL", result?.layoutStyle === "MINIMAL");
}

group("V2-2 — SAGE + scannable → COMMERCIAL");
{
  const result = inferLayoutStyleFromBrand("SAGE", {
    brandToneOfVoice: "Scanbaar, snel, to-the-point voor B2C-publiek",
  });
  assert("SAGE scannable → COMMERCIAL", result?.layoutStyle === "COMMERCIAL");
}

group("V2-2 — SAGE zonder scannable → base EDITORIAL");
{
  const result = inferLayoutStyleFromBrand("SAGE", {
    brandToneOfVoice: "Evidence-led, considered, authoritative",
  });
  assert("SAGE base → EDITORIAL", result?.layoutStyle === "EDITORIAL");
}

group("V2-2 — CREATOR + storytelling → EXPERIENTIAL");
{
  const result = inferLayoutStyleFromBrand("CREATOR", {
    brandEssence: "Verhalen vertellen via originele vormgeving",
  });
  assert(
    "CREATOR storytelling → EXPERIENTIAL",
    result?.layoutStyle === "EXPERIENTIAL",
  );
}

group("V2-2 — INNOCENT + refined → MINIMAL (low confidence)");
{
  const result = inferLayoutStyleFromBrand("INNOCENT", {
    brandPersonality: "Verfijnd, elegant, puur",
  });
  assert("INNOCENT refined → MINIMAL", result?.layoutStyle === "MINIMAL");
  assert("low confidence (ongebruikelijke combi)", result?.confidence === "low");
}

group("V2-2 — REGULAR_GUY + intimate → PLAYFUL");
{
  const result = inferLayoutStyleFromBrand("REGULAR_GUY", {
    brandPersonality: "Warm, persoonlijk, dichtbij",
  });
  assert(
    "REGULAR_GUY intimate → PLAYFUL",
    result?.layoutStyle === "PLAYFUL",
  );
}

group("V2-2 — LOVER + refined → EDITORIAL");
{
  const result = inferLayoutStyleFromBrand("LOVER", {
    brandToneOfVoice: "Sophisticated, elegant, intiem",
  });
  assert("LOVER refined → EDITORIAL", result?.layoutStyle === "EDITORIAL");
}

group("V2-2 — tone-signalen worden uit meerdere velden gelezen");
{
  // Premium in brandPersonality i.p.v. brandToneOfVoice
  const result = inferLayoutStyleFromBrand("HERO", {
    brandPersonality: "Premium kwaliteit",
  });
  assert(
    "premium in brandPersonality wordt opgepikt",
    result?.layoutStyle === "MINIMAL",
  );

  // Storytelling in brandEssence
  const result2 = inferLayoutStyleFromBrand("CREATOR", {
    brandStory: "Onze reis begon met een narratief...",
  });
  assert(
    "storytelling in brandStory wordt opgepikt",
    result2?.layoutStyle === "EXPERIENTIAL",
  );

  // Refined in brandValues
  const result3 = inferLayoutStyleFromBrand("LOVER", {
    brandValues: ["elegant", "verfijnd"],
  });
  assert(
    "refined in brandValues wordt opgepikt",
    result3?.layoutStyle === "EDITORIAL",
  );
}

group("V2-2 — geen contraire tone → base mapping wint");
{
  const result = inferLayoutStyleFromBrand("RULER", {
    brandToneOfVoice: "Premium, refined, authoritative",
  });
  // RULER base = MINIMAL, premium/refined consistent met base → blijft MINIMAL
  assert("RULER + consistent tone → blijft MINIMAL", result?.layoutStyle === "MINIMAL");
  assert("high confidence (geen nudge nodig)", result?.confidence === "high");
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
