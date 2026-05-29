/**
 * Smoke-test voor Fase E1 — hero-visual prompt met photography-DNA uit
 * tokens.photography.promptFragment.
 *
 * Test alleen de pure helper (geen UI / image-gen call). De functie zit als
 * inline helper in LandingPageGenerateBlock.tsx; we testen via een
 * gespiegelde reproductie van de logica vanaf de externe shape.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase32-hero-visual-prompt.ts
 */

import type { LandingPageVariantContent } from "../../src/lib/landing-pages/variant-schema";
import {
  DEFAULT_BRAND_TOKENS,
  type BrandTokens,
} from "../../src/lib/landing-pages/brand-tokens";
import { getDesignSystemForLayoutStyle } from "../../src/lib/landing-pages/design-system";
import { computeBrandRenderHints } from "../../src/lib/landing-pages/brand-render-rules";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

// ─── Reproductie van buildHeroVisualInstruction logic ────
// (Houden in sync met src/features/.../LandingPageGenerateBlock.tsx)

function buildHeroVisualInstruction(
  variant: { hero: { headline: string; subhead: string } },
  contextStack: {
    brand?: {
      brandImageryStyle?: string | null;
      brandImageryDonts?: string[] | null;
      brandName?: string | null;
    } | null;
    brandTokens?: BrandTokens;
  } | null,
): string {
  const brand = contextStack?.brand;
  const tokens = contextStack?.brandTokens;
  const hints = tokens
    ? computeBrandRenderHints(tokens.archetype, tokens.designSystem)
    : null;
  const parts: string[] = [];
  parts.push(`Hero-visual for landing-page about: ${variant.hero.headline}`);
  parts.push(`Subject context: ${variant.hero.subhead}`);
  const photographyFragment = tokens?.photography?.promptFragment?.trim();
  if (photographyFragment) {
    parts.push(photographyFragment);
  } else if (hints) {
    parts.push(`Photography style: ${hints.heroImagePromptFragment}`);
  }
  if (brand?.brandImageryStyle) parts.push(`Brand imagery: ${brand.brandImageryStyle}`);
  if (brand?.brandName) parts.push(`Brand: ${brand.brandName}`);
  const donts = brand?.brandImageryDonts;
  if (donts && donts.length > 0) {
    parts.push(`Avoid: ${donts.join(", ")}`);
  } else {
    parts.push("Avoid: stock photo people, generic SaaS illustrations, text overlays, lens flares");
  }
  return parts.join(". ") + ".";
}

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
      promptFragment:
        "Photography mood: Sophisticated, architectural, aspirational. Composition: Wide-angle interior shots. Subjects: Installed floor hatches in luxury homes.",
    },
  };
  const result = buildHeroVisualInstruction(VARIANT, {
    brand: { brandName: "LINFI" },
    brandTokens: tokens,
  });
  assert("bevat scraped mood", result.toLowerCase().includes("sophisticated"));
  assert("bevat composition", result.toLowerCase().includes("wide-angle"));
  assert("bevat subjects", result.toLowerCase().includes("floor hatches"));
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
      promptFragment: "Photography mood: Sophisticated. Composition: Wide-angle. Subjects: Luxury homes.",
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
