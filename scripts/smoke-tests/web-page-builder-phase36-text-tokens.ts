/**
 * Smoke-test voor C4 — Text-hiërarchie tokens.
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase36-text-tokens.ts
 */
import { mapTextTokens } from "../../src/lib/landing-pages/brand-tokens-v4-mappers";
import { DEFAULT_BRAND_TOKENS } from "../../src/lib/landing-pages/brand-tokens";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

group("C4 — mapTextTokens met null profile → defaults + onSurface/muted aliases");
{
  const result = mapTextTokens(null, "#000000", "#404D5E", DEFAULT_BRAND_TOKENS.text);
  assert("heading.color = onSurface", result.heading.color === "#000000");
  assert("body.color = onSurface", result.body.color === "#000000");
  assert("secondary.color = surfaceMuted", result.secondary.color === "#404D5E");
  assert("caption.color = surfaceMuted", result.caption.color === "#404D5E");
  assert("heading.weight = default 700", result.heading.weight === 700);
  assert("body.weight = default 400", result.body.weight === 400);
  assert("banner.textTransform default uppercase", result.banner.textTransform === "uppercase");
  assert("banner.letterSpacing default 0.1em", result.banner.letterSpacing === "0.1em");
}

group("C4 — scraped typography overrules defaults");
{
  const typo = {
    heading: { fontWeight: "300", fontSize: "64px" },     // licht display
    body: { fontWeight: "300" },                          // licht body
    label: { fontWeight: "500", letterSpacing: "0.05em", textTransform: "uppercase", fontSize: "11px" },
  };
  const result = mapTextTokens(typo, "#000", "#666", DEFAULT_BRAND_TOKENS.text);
  assert("heading.weight = scraped 300", result.heading.weight === 300);
  assert("body.weight = scraped 300", result.body.weight === 300);
  assert("banner.letterSpacing scraped 0.05em", result.banner.letterSpacing === "0.05em");
  assert("banner.weight scraped 500", result.banner.weight === 500);
  assert("banner.fontSize 11", result.banner.fontSize === 11);
}

group("C4 — display fallback voor heading wanneer alleen display gegeven");
{
  const typo = { display: { fontWeight: "900" } };
  const result = mapTextTokens(typo, "#000", "#666", DEFAULT_BRAND_TOKENS.text);
  assert("heading.weight = display 900 (fallback)", result.heading.weight === 900);
}

group("C4 — DEFAULT_BRAND_TOKENS.text bestaat met alle 5 keys");
{
  const t = DEFAULT_BRAND_TOKENS.text;
  assert("heading exists", !!t.heading);
  assert("body exists", !!t.body);
  assert("secondary exists", !!t.secondary);
  assert("caption exists", !!t.caption);
  assert("banner exists", !!t.banner);
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
