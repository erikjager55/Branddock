/**
 * Smoke-test voor E-3 — non-Google font-bronnen (Adobe Typekit / uploaded).
 *
 * Verifies (data-laag — DOM-injectie zelf is React/document, getest door tsc):
 *  - extractBrandTokensFromStyleguide vult fontAssets met UPLOADED + ADOBE_FONTS
 *  - GOOGLE_FONTS fonts komen NIET in fontAssets (stack-loader dekt die al)
 *  - family wordt gesaneerd (eerste stack-naam, quotes + weight-suffix weg)
 *  - UPLOADED draagt fileUrl + fileType door; ADOBE_FONTS niet
 *  - opts.adobeFontsKitId → tokens.adobeFontsKitId; geen opts → null
 *  - leeg/ontbrekend styleguide → fontAssets [] (geen crash)
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase57-font-assets.ts
 */

import { extractBrandTokensFromStyleguide } from "../../src/lib/landing-pages/brand-tokens";

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

const styleguide = {
  primaryFontName: "Effra",
  layoutStyle: "EDITORIAL" as const,
  colors: [
    { hex: "#212529", category: "NEUTRAL", tags: ["text", "dark"], sortOrder: 0 },
    { hex: "#FFFFFF", category: "NEUTRAL", tags: ["background", "surface", "light"], sortOrder: 1 },
  ],
  fonts: [
    {
      name: "Effra",
      role: "DISPLAY",
      fontFamily: '"Effra Bold", sans-serif',
      sortOrder: 0,
      availability: "ADOBE_FONTS" as const,
      fileUrl: null,
      fileType: null,
    },
    {
      name: "House Sans",
      role: "BODY",
      fontFamily: "House Sans",
      sortOrder: 1,
      availability: "UPLOADED" as const,
      fileUrl: "https://cdn.example.com/fonts/house-sans.woff2",
      fileType: "woff2",
    },
    {
      name: "Inter",
      role: "UI",
      fontFamily: "Inter",
      sortOrder: 2,
      availability: "GOOGLE_FONTS" as const,
      fileUrl: null,
      fileType: null,
    },
  ],
};

// ─── Tests ─────────────────────────────────────────────

group("fontAssets — alleen non-Google bronnen, gesaneerd");
{
  const tokens = extractBrandTokensFromStyleguide(styleguide, { adobeFontsKitId: "abc1xyz" });
  const families = tokens.fontAssets.map((a) => a.family);
  assert("2 fontAssets (UPLOADED + ADOBE_FONTS, niet Google)", tokens.fontAssets.length === 2, `n=${tokens.fontAssets.length}`);
  assert("Google-font niet in fontAssets", !families.includes("Inter"));

  const adobe = tokens.fontAssets.find((a) => a.availability === "ADOBE_FONTS");
  assert("ADOBE_FONTS family gesaneerd ('Effra Bold' → 'Effra')", adobe?.family === "Effra", adobe?.family);
  assert("ADOBE_FONTS draagt geen fileUrl", adobe?.fileUrl === null);

  const uploaded = tokens.fontAssets.find((a) => a.availability === "UPLOADED");
  assert("UPLOADED family = 'House Sans'", uploaded?.family === "House Sans", uploaded?.family);
  assert("UPLOADED draagt fileUrl door", uploaded?.fileUrl === "https://cdn.example.com/fonts/house-sans.woff2");
  assert("UPLOADED draagt fileType door", uploaded?.fileType === "woff2");
}

group("adobeFontsKitId — uit opts, anders null");
{
  const withKit = extractBrandTokensFromStyleguide(styleguide, { adobeFontsKitId: "abc1xyz" });
  assert("kit-id uit opts doorgegeven", withKit.adobeFontsKitId === "abc1xyz", String(withKit.adobeFontsKitId));

  const noOpts = extractBrandTokensFromStyleguide(styleguide);
  assert("geen opts → adobeFontsKitId null", noOpts.adobeFontsKitId === null);

  const blankKit = extractBrandTokensFromStyleguide(styleguide, { adobeFontsKitId: "   " });
  assert("lege/whitespace kit → null", blankKit.adobeFontsKitId === null);
}

group("Geen styleguide / geen fonts → lege fontAssets");
{
  const none = extractBrandTokensFromStyleguide(null);
  assert("null styleguide → fontAssets []", Array.isArray(none.fontAssets) && none.fontAssets.length === 0);
  assert("null styleguide → adobeFontsKitId null", none.adobeFontsKitId === null);

  const noFonts = extractBrandTokensFromStyleguide({ ...styleguide, fonts: [] });
  assert("geen fonts → fontAssets []", noFonts.fontAssets.length === 0);
}

console.log(`\nTotal: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
