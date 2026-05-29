/**
 * Smoke-test voor Fase A2 — typography per rol.
 *
 * Tests:
 *  - h1 / h2 / body / p / .caption / button selectors worden naar correct
 *    rol (display/heading/body/label/button) geclassificeerd
 *  - Weight-priority: hoogste-weight selector wint per rol (h1 > .display-1)
 *  - Pseudo-states + modal/dropdown selectors uitgesloten
 *  - Property-set per rol: fontFamily/fontSize/fontWeight/lineHeight/
 *    letterSpacing/textTransform
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase26-typography-per-rol.ts
 */

import { extractTypographyByRole } from "../../src/lib/brandstyle/typography-extractor";

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

// ─── Fixture 1: standard CSS ──────────────────────────────

group("A2 — standard CSS met h1/h2/body/p/.caption/button");
{
  const css = `
    body {
      font-family: "Inter", sans-serif;
      font-size: 16px;
      line-height: 1.5;
    }
    h1 {
      font-family: "Cormorant Garamond", serif;
      font-size: 64px;
      font-weight: 300;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }
    h2 {
      font-family: "Cormorant Garamond", serif;
      font-size: 40px;
      font-weight: 400;
    }
    h4 {
      font-size: 20px;
      font-weight: 500;
    }
    p {
      font-size: 16px;
      line-height: 1.6;
    }
    .caption {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    button {
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  `;
  const result = extractTypographyByRole(css);

  // Display
  assert("display gevonden", !!result.display);
  assert("display.fontFamily=Cormorant Garamond", result.display?.fontFamily === "Cormorant Garamond");
  assert("display.fontSize=64px", result.display?.fontSize === "64px");
  assert("display.fontWeight=300", result.display?.fontWeight === "300");
  assert("display.lineHeight=1.1", result.display?.lineHeight === "1.1");
  assert("display.letterSpacing=-0.02em", result.display?.letterSpacing === "-0.02em");

  // Heading
  assert("heading gevonden", !!result.heading);
  assert("heading.fontFamily=Cormorant Garamond", result.heading?.fontFamily === "Cormorant Garamond");
  assert("heading.fontSize=40px", result.heading?.fontSize === "40px");

  // Subheading (h4)
  assert("subheading gevonden", !!result.subheading);
  assert("subheading.fontSize=20px", result.subheading?.fontSize === "20px");

  // Body
  assert("body gevonden", !!result.body);
  assert("body.fontFamily=Inter", result.body?.fontFamily === "Inter");
  assert("body.fontSize=16px", result.body?.fontSize === "16px");
  assert("body.lineHeight=1.5 (body wint van p)", result.body?.lineHeight === "1.5");

  // Label
  assert("label gevonden", !!result.label);
  assert("label.textTransform=uppercase", result.label?.textTransform === "uppercase");
  assert("label.letterSpacing=0.1em", result.label?.letterSpacing === "0.1em");

  // Button
  assert("button gevonden", !!result.button);
  assert("button.fontWeight=600", result.button?.fontWeight === "600");
  assert("button.textTransform=uppercase", result.button?.textTransform === "uppercase");
}

// ─── Fixture 2: weight priority ───────────────────────────

group("A2 — h1 wint van .display-* met dezelfde rol");
{
  const css = `
    .display-1 { font-size: 80px; font-family: "Roboto"; }
    h1 { font-size: 64px; font-family: "Playfair Display"; }
  `;
  const result = extractTypographyByRole(css);
  // h1 weight=10, .display-* weight=9, dus h1 wint
  assert(
    "display.fontFamily=Playfair Display (h1 wint)",
    result.display?.fontFamily === "Playfair Display",
    `got ${result.display?.fontFamily}`,
  );
  assert(
    "display.fontSize=64px (h1 wint)",
    result.display?.fontSize === "64px",
  );
}

// ─── Fixture 3: pseudo + skip patterns ────────────────────

group("A2 — pseudo-states + modal/dropdown uitgesloten");
{
  const css = `
    h1 { font-family: "A"; }
    h1:hover { font-family: "B"; }
    h1::before { content: "x"; font-family: "C"; }
    .modal h1 { font-family: "D"; }
    .dropdown h1 { font-family: "E"; }
  `;
  const result = extractTypographyByRole(css);
  // Alleen base h1 → A
  assert("base h1 → A wint", result.display?.fontFamily === "A");
  assert(
    "skip-patterns niet in sourceSelectors",
    !result.display?.sourceSelectors.some((s) => /:hover|::before|modal|dropdown/.test(s)),
  );
}

// ─── Fixture 4: comma-separated h1, h2, h3 ────────────────

group("A2 — h1, h2, h3 comma-split classificeert separaat");
{
  const css = `
    h1, h2, h3 { font-family: "Display Serif"; font-weight: 400; }
  `;
  const result = extractTypographyByRole(css);
  assert("display gevonden", !!result.display);
  assert("heading gevonden", !!result.heading);
  // h1 → display (weight 10), h2 → heading (weight 10), h3 → heading (weight 9)
  assert("display.fontFamily", result.display?.fontFamily === "Display Serif");
  assert("heading.fontFamily", result.heading?.fontFamily === "Display Serif");
}

// ─── Fixture 5: no matches → empty ────────────────────────

group("A2 — geen herkenbare selectors → empty object");
{
  const css = `
    .container { max-width: 1200px; }
    .grid { display: grid; }
  `;
  const result = extractTypographyByRole(css);
  assert("no display", !result.display);
  assert("no heading", !result.heading);
  assert("no body", !result.body);
  assert("no label", !result.label);
  assert("no button", !result.button);
}

// ─── Fixture 6: framework selectors ───────────────────────

group("A2 — framework selectors (.wp-block-button / button / .btn)");
{
  const css = `
    .wp-block-button .btn { font-weight: 700; text-transform: uppercase; }
    button { font-family: "Inter"; font-weight: 600; }
  `;
  const result = extractTypographyByRole(css);
  assert("button-rol gevuld", !!result.button);
}

// ─── Fixture 7: long-form property-set ────────────────────

group("A2 — eerste-niet-null per veld, hoogst-gewogen selector telt");
{
  const css = `
    .lead { font-weight: 300; }
    h4 { font-size: 24px; font-family: "Heading Font"; }
  `;
  const result = extractTypographyByRole(css);
  // h4 weight=10, .lead weight=7
  // fontSize alleen op h4 → 24px
  // fontWeight alleen op .lead → 300
  // fontFamily alleen op h4 → "Heading Font"
  assert("subheading.fontSize=24px (h4)", result.subheading?.fontSize === "24px");
  assert("subheading.fontFamily=Heading Font", result.subheading?.fontFamily === "Heading Font");
  assert("subheading.fontWeight=300 (fallback)", result.subheading?.fontWeight === "300");
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
