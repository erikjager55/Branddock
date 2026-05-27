/**
 * Smoke-test voor Fase C — BrandTokens v4 mappers + extractor integration.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase30-tokens-v4.ts
 */
import {
  mapButtonTokens,
  mapElevationTokens,
  mapIconographyTokens,
  mapSectionRhythmTokens,
  mapMotionTokens,
  mapPhotographyTokens,
} from "../../src/lib/landing-pages/brand-tokens-v4-mappers";
import {
  DEFAULT_BRAND_TOKENS,
  extractBrandTokensFromStyleguide,
} from "../../src/lib/landing-pages/brand-tokens";
import { getDesignSystemForLayoutStyle } from "../../src/lib/landing-pages/design-system";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

// ─── Button tokens ────────────────────────────────────────

group("C — mapButtonTokens uit primary scraped button");
{
  const buttonProfile = [
    {
      selector: ".btn-primary",
      role: "primary",
      paddingY: "18px",
      paddingX: "36px",
      fontWeight: "500",
      fontSize: "16px",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      borderRadius: "0",
      background: "#B59032",
      color: "#000",
      hoverBackground: "#CAA33F",
      hoverTransform: null,
    },
  ];
  const result = mapButtonTokens(buttonProfile, "RULER", DEFAULT_BRAND_TOKENS.button);
  assert("paddingY=18", result.paddingY === 18);
  assert("paddingX=36", result.paddingX === 36);
  assert("radiusPx=0", result.radiusPx === 0);
  assert("fontWeight=500", result.fontWeight === 500);
  assert("textTransform=uppercase", result.textTransform === "uppercase");
  assert("letterSpacing=0.05em", result.letterSpacing === "0.05em");
  // RULER archetype + lichter hover bg → lighten
  assert("hoverStyle=lighten (CAA > B59)", result.hoverStyle === "lighten");
}

group("C — mapButtonTokens fallback bij empty profile");
{
  const result = mapButtonTokens(null, "RULER", DEFAULT_BRAND_TOKENS.button);
  assert("identical to fallback", result.paddingY === DEFAULT_BRAND_TOKENS.button.paddingY);
  assert("hover=darken default", result.hoverStyle === DEFAULT_BRAND_TOKENS.button.hoverStyle);
}

group("C — pixel-conversie van rem/em");
{
  const buttonProfile = [
    {
      selector: ".btn",
      role: "primary",
      paddingY: "1rem",
      paddingX: "2rem",
      borderRadius: "0.5em",
      fontWeight: "600",
      fontSize: "1rem",
      background: "#000",
    },
  ];
  const result = mapButtonTokens(buttonProfile, null, DEFAULT_BRAND_TOKENS.button);
  assert("1rem → 16", result.paddingY === 16);
  assert("2rem → 32", result.paddingX === 32);
  assert("0.5em → 8", result.radiusPx === 8);
  assert("fontSize 1rem → 16", result.fontSize === 16);
}

// ─── Elevation tokens ─────────────────────────────────────

group("C — mapElevationTokens border-only LINFI pattern");
{
  // LINFI: shadow "0 0 0 1px rgba(0,0,0,0.06)" = border-only fake shadow
  const elev = {
    samples: [{ raw: "0 0 0 1px rgba(0,0,0,0.06)", category: "subtle-shadow" }],
    dominantCategory: "subtle-shadow",
  };
  const radius = { cardTypical: "0" };
  const result = mapElevationTokens(elev, radius, DEFAULT_BRAND_TOKENS.elevation);
  assert("cardElevationCategory=border-only", result.cardElevationCategory === "border-only");
  assert("cardBorderWidth=1", result.cardBorderWidth === 1);
  assert("cardBorderRadius=0", result.cardBorderRadius === 0);
}

group("C — mapElevationTokens strong-shadow PLAYFUL");
{
  const elev = {
    samples: [{ raw: "0 12px 32px rgba(0,0,0,0.2)", category: "strong-shadow" }],
    dominantCategory: "strong-shadow",
  };
  const radius = { cardTypical: "16px" };
  const result = mapElevationTokens(elev, radius, DEFAULT_BRAND_TOKENS.elevation);
  assert("cardElevationCategory=strong-shadow", result.cardElevationCategory === "strong-shadow");
  assert("cardBorderRadius=16", result.cardBorderRadius === 16);
  assert("cardBorderWidth=0", result.cardBorderWidth === 0);
}

group("C — mapElevationTokens none → flat");
{
  const elev = { samples: [], dominantCategory: "none" };
  const radius = { cardTypical: "0" };
  const result = mapElevationTokens(elev, radius, DEFAULT_BRAND_TOKENS.elevation);
  assert("cardElevationCategory=flat", result.cardElevationCategory === "flat");
  assert("cardShadow=none", result.cardShadow === "none");
}

// ─── Iconography tokens ───────────────────────────────────

group("C — mapIconographyTokens archetype-driven");
{
  const ruler = mapIconographyTokens("RULER", "MINIMAL", DEFAULT_BRAND_TOKENS.iconography);
  assert("RULER strokeWeight=1.25 (dunner)", ruler.strokeWeight === 1.25);
  assert("MINIMAL sizeDefault=32 (groter)", ruler.sizeDefault === 32);

  const jester = mapIconographyTokens("JESTER", "PLAYFUL", DEFAULT_BRAND_TOKENS.iconography);
  assert("JESTER strokeWeight=2 (bolder)", jester.strokeWeight === 2);

  const sage = mapIconographyTokens("SAGE", "COMMERCIAL", DEFAULT_BRAND_TOKENS.iconography);
  assert("SAGE strokeWeight=1.25", sage.strokeWeight === 1.25);
  assert("COMMERCIAL sizeDefault=22 (compact)", sage.sizeDefault === 22);
}

// ─── SectionRhythm tokens ─────────────────────────────────

group("C — mapSectionRhythmTokens uit LINFI spacing");
{
  const spacing = {
    section: { typical: { paddingY: "160px", paddingX: "32px" }, samples: [] },
    card: { typical: { paddingY: "48px", paddingX: "32px" }, samples: [] },
  };
  const ds = getDesignSystemForLayoutStyle("MINIMAL");
  const result = mapSectionRhythmTokens(spacing, ds, DEFAULT_BRAND_TOKENS.sectionRhythm);
  assert("sectionPaddingY=160", result.sectionPaddingY === 160);
  assert("sectionPaddingX=32", result.sectionPaddingX === 32);
  assert("cardPaddingY=48", result.cardPaddingY === 48);
  assert("cardPaddingX=32", result.cardPaddingX === 32);
}

group("C — mapSectionRhythmTokens fallback uit designSystem");
{
  const ds = getDesignSystemForLayoutStyle("COMMERCIAL");
  const result = mapSectionRhythmTokens(null, ds, DEFAULT_BRAND_TOKENS.sectionRhythm);
  // COMMERCIAL ds.spacing[5] is veel kleiner dan MINIMAL
  assert(
    "sectionPaddingY uit ds.spacing[5]",
    result.sectionPaddingY === ds.spacing[Math.min(ds.spacing.length - 1, 5)],
  );
}

// ─── Motion tokens ────────────────────────────────────────

group("C — mapMotionTokens uit scraped profile");
{
  const motion = { averageDurationMs: 250, dominantEasing: "ease-out" };
  const result = mapMotionTokens(motion, DEFAULT_BRAND_TOKENS.motion);
  assert("duration=250ms", result.transitionDuration === "250ms");
  assert("easing=ease-out", result.easing === "ease-out");

  const empty = mapMotionTokens(null, DEFAULT_BRAND_TOKENS.motion);
  assert("fallback duration", empty.transitionDuration === DEFAULT_BRAND_TOKENS.motion.transitionDuration);
}

// ─── Photography tokens ───────────────────────────────────

group("C — mapPhotographyTokens met OBSERVED-prefix strip");
{
  const ps = {
    mood: "OBSERVED: Sophisticated, architectural, aspirational",
    subjects: "RECOMMENDED: Installed floor hatches in luxury homes",
    composition: "OBSERVED: Wide-angle interior shots",
  };
  const result = mapPhotographyTokens(ps, DEFAULT_BRAND_TOKENS.photography);
  assert("mood not null", result.mood !== null);
  assert(
    "promptFragment bevat mood-tekst",
    result.promptFragment.toLowerCase().includes("sophisticated"),
  );
  assert(
    "promptFragment heeft geen 'OBSERVED:' prefix",
    !result.promptFragment.includes("OBSERVED:"),
  );
  assert(
    "promptFragment max 500 chars",
    result.promptFragment.length <= 500,
  );
}

// ─── End-to-end LINFI ─────────────────────────────────────

group("C — extractBrandTokensFromStyleguide LINFI complete");
{
  const styleguide = {
    primaryFontName: "Poppins",
    layoutStyle: "MINIMAL" as const,
    archetype: "RULER" as const,
    colors: [
      { hex: "#FFFFFF", category: "NEUTRAL", sortOrder: 0, tags: ["surface", "background"], contrastWhite: "1.00", contrastBlack: "21.00" },
      { hex: "#000000", category: "NEUTRAL", sortOrder: 1, tags: ["text"], contrastWhite: "21.00", contrastBlack: "1.00" },
      { hex: "#B59032", category: "PRIMARY", sortOrder: 2, tags: ["brand"], contrastWhite: "3.00", contrastBlack: "7.00" },
    ],
    fonts: [
      { name: "Cormorant Garamond", role: "DISPLAY", fontFamily: '"Cormorant Garamond", serif', sortOrder: 0 },
      { name: "DM Sans", role: "BODY", fontFamily: '"DM Sans", sans-serif', sortOrder: 1 },
    ],
    buttonProfile: [
      {
        selector: ".btn-primary",
        role: "primary",
        paddingY: "18px",
        paddingX: "36px",
        fontWeight: "500",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        borderRadius: "0",
        background: "#B59032",
        color: "#000",
        hoverBackground: "#CAA33F",
      },
    ],
    spacingProfile: {
      section: { typical: { paddingY: "160px", paddingX: "32px" }, samples: [] },
      card: { typical: { paddingY: "48px", paddingX: "32px" }, samples: [] },
      button: { typical: null, samples: [] },
      input: { typical: null, samples: [] },
      container: { typical: null, samples: [] },
    },
    elevationProfile: {
      samples: [{ raw: "0 0 0 1px rgba(0,0,0,0.06)", category: "subtle-shadow" }],
      dominantCategory: "subtle-shadow",
    },
    radiusProfile: { cardTypical: "0", buttonTypical: "0", inputTypical: null, card: [], button: [], section: [], input: [] },
    motionProfile: { averageDurationMs: 200, dominantEasing: "ease", samples: [], dominantCategory: "quick" },
    photographyStyle: {
      mood: "Sophisticated, architectural, luxury",
      composition: "Wide-angle interior shots",
      subjects: "Installed floor hatches in luxury homes",
    },
  };

  const tokens = extractBrandTokensFromStyleguide(styleguide);

  // v3 nog intact
  assert("brand=Golden Bronze", tokens.brand === "#B59032");
  assert("layoutStyle=MINIMAL", tokens.layoutStyle === "MINIMAL");
  assert("archetype=RULER", tokens.archetype === "RULER");

  // v4 button
  assert("button.paddingY=18", tokens.button.paddingY === 18);
  assert("button.textTransform=uppercase", tokens.button.textTransform === "uppercase");
  assert("button.radiusPx=0", tokens.button.radiusPx === 0);

  // v4 elevation
  assert(
    "elevation=border-only (LINFI fake-shadow)",
    tokens.elevation.cardElevationCategory === "border-only",
  );

  // v4 iconography (archetype-driven: RULER → 1.25 stroke + MINIMAL → 32 size)
  assert("iconography stroke=1.25", tokens.iconography.strokeWeight === 1.25);
  assert("iconography size=32", tokens.iconography.sizeDefault === 32);

  // v4 sectionRhythm
  assert("sectionPaddingY=160", tokens.sectionRhythm.sectionPaddingY === 160);
  assert("cardPaddingY=48", tokens.sectionRhythm.cardPaddingY === 48);

  // v4 motion
  assert("motion=200ms ease", tokens.motion.transitionDuration === "200ms" && tokens.motion.easing === "ease");

  // v4 photography
  assert(
    "photography.promptFragment niet leeg",
    tokens.photography.promptFragment.length > 0,
  );
  assert(
    "photography.mood preserved",
    tokens.photography.mood !== null,
  );
}

// ─── DEFAULT_BRAND_TOKENS heeft alle v4 velden ────────────

group("C — DEFAULT_BRAND_TOKENS heeft alle v4 sub-tokens");
{
  assert("button default exists", typeof DEFAULT_BRAND_TOKENS.button === "object");
  assert("elevation default exists", typeof DEFAULT_BRAND_TOKENS.elevation === "object");
  assert("iconography default exists", typeof DEFAULT_BRAND_TOKENS.iconography === "object");
  assert("sectionRhythm default exists", typeof DEFAULT_BRAND_TOKENS.sectionRhythm === "object");
  assert("motion default exists", typeof DEFAULT_BRAND_TOKENS.motion === "object");
  assert("photography default exists", typeof DEFAULT_BRAND_TOKENS.photography === "object");
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
