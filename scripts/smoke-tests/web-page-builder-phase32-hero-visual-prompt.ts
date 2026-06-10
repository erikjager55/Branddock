/**
 * Smoke-test voor Fase E1 — hero-visual prompt met photography-DNA uit
 * tokens.photography.promptFragment.
 *
 * Test de ECHTE pure helper uit landing-page-visual-prompts.ts (de functie is
 * sinds de extractie uit LandingPageGenerateBlock importeerbaar — de eerdere
 * "gespiegelde reproductie" hier dreef stilletjes uit sync, gefixt 2026-06-10).
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase32-hero-visual-prompt.ts
 */

import type { LandingPageVariantContent } from "../../src/lib/landing-pages/variant-schema";
import {
  DEFAULT_BRAND_TOKENS,
  type BrandTokens,
} from "../../src/lib/landing-pages/brand-tokens";
import { getDesignSystemForLayoutStyle } from "../../src/lib/landing-pages/design-system";
import { buildHeroVisualInstruction } from "../../src/features/campaigns/lib/landing-page-visual-prompts";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

// ─── Fixtures ────────────────────────────────────────────

const VARIANT: { hero: { headline: string; subhead: string } } = {
  hero: {
    headline: "Vloerluiken die uw interieur verrijken",
    subhead: "Elektrische vloerluiken op maat",
  },
} as unknown as LandingPageVariantContent;

// ─── Tier-1: scraped photography wint ────────────────────

group("E1 — scraped photography.promptFragment wint van archetype-default");
{
  const tokens: BrandTokens = {
    ...DEFAULT_BRAND_TOKENS,
    layoutStyle: "MINIMAL",
    designSystem: getDesignSystemForLayoutStyle("MINIMAL"),
    archetype: "RULER",
    photography: {
      mood: "Sophisticated, architectural, aspirational",
      compositionStyle: "Wide-angle interior shots",
      subjectMatter: "Installed floor hatches in luxury homes",
      // R1-split (audit 2026-06-10): promptFragment is stijl-only; compositie
      // gaat apart mee voor single-image contexten (hero); subjects zijn een
      // pool en horen NIET meer in de hero-prompt.
      promptFragment: "Photography mood: Sophisticated, architectural, aspirational.",
      compositionFragment: "Composition: Wide-angle interior shots.",
      subjectPool: ["Installed floor hatches in luxury homes"],
    },
  };
  const result = buildHeroVisualInstruction(VARIANT, {
    brand: { brandName: "LINFI" },
    brandTokens: tokens,
  });
  assert("bevat scraped mood", result.toLowerCase().includes("sophisticated"));
  assert("bevat composition (hero = single-image context)", result.toLowerCase().includes("wide-angle"));
  assert("subjects NIET in hero-prompt (pool, geen staart)", !result.toLowerCase().includes("floor hatches"));
  assert("bevat brand-name", result.includes("LINFI"));
  assert("bevat headline", result.includes("Vloerluiken"));
}

// ─── Tier-2: zonder photography → archetype-default ──────

group("E1 — geen scraped photography → archetype-default fragment");
{
  const tokens: BrandTokens = {
    ...DEFAULT_BRAND_TOKENS,
    layoutStyle: "MINIMAL",
    designSystem: getDesignSystemForLayoutStyle("MINIMAL"),
    archetype: "RULER",
    photography: {
      mood: null,
      compositionStyle: null,
      subjectMatter: null,
      promptFragment: "",  // empty
      compositionFragment: null,
      subjectPool: [],
    },
  };
  const result = buildHeroVisualInstruction(VARIANT, {
    brand: { brandName: "Empty Brand" },
    brandTokens: tokens,
  });
  // Archetype-default fragment uit hints
  assert("bevat 'Photography style:' label (Tier-2)", result.includes("Photography style:"));
}

// ─── Donts inclusie ──────────────────────────────────────

group("E1 — brandImageryDonts inclusie + fallback");
{
  const tokens: BrandTokens = {
    ...DEFAULT_BRAND_TOKENS,
    photography: { ...DEFAULT_BRAND_TOKENS.photography, promptFragment: "" },
  };
  const withDonts = buildHeroVisualInstruction(VARIANT, {
    brand: {
      brandName: "X",
      brandImageryDonts: ["No stock photography", "No generic interiors"],
    },
    brandTokens: tokens,
  });
  assert("custom donts opgenomen", withDonts.includes("No stock photography"));
  assert("custom donts opgenomen 2", withDonts.includes("No generic interiors"));
  assert("geen default-donts wanneer custom aanwezig", !withDonts.includes("generic SaaS illustrations"));

  const withoutDonts = buildHeroVisualInstruction(VARIANT, {
    brand: { brandName: "X" },
    brandTokens: tokens,
  });
  assert(
    "default-donts gebruikt wanneer geen custom",
    withoutDonts.includes("generic SaaS illustrations"),
  );
}

// ─── Strip OBSERVED-prefix is al gedaan in mapPhotographyTokens ──

group("E1 — promptFragment is al opgeschoond (OBSERVED-prefix uit Fase C)");
{
  const tokens: BrandTokens = {
    ...DEFAULT_BRAND_TOKENS,
    photography: {
      mood: "Sophisticated",
      compositionStyle: "Wide-angle",
      subjectMatter: "Luxury homes",
      promptFragment: "Photography mood: Sophisticated.",
      compositionFragment: "Composition: Wide-angle.",
      subjectPool: ["Luxury homes"],
    },
  };
  const result = buildHeroVisualInstruction(VARIANT, {
    brand: { brandName: "X" },
    brandTokens: tokens,
  });
  assert("geen 'OBSERVED:' in output", !result.includes("OBSERVED:"));
  assert("geen 'RECOMMENDED:' in output", !result.includes("RECOMMENDED:"));
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
