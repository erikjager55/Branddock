/**
 * Smoke-test voor CTA-zichtbaarheid + CTA-doel-URL (Better Brands-bevindingen).
 *
 * 1. colorAlpha / isWeakButtonBackground: een translucent scraped button-bg
 *    (bv. `rgb(255 255 255 / .1)`) wordt herkend als "zwak" → renderer valt
 *    terug op de merk-accent zodat de CTA niet als platte tekst verschijnt.
 * 2. normalizeColorToHex: parst nu óók space/slash-syntax + 8-digit hex zodat
 *    contrast-checks de moderne CSS-kleuren zien.
 * 3. resolveCtaHref: alleen http(s)/root-relatief/mailto/tel passeren; al het
 *    andere (en leeg) → "#".
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase61-cta-visibility-href.ts
 */
import { colorAlpha, isWeakButtonBackground } from "../../src/lib/landing-pages/scraped-css-helpers";
import { normalizeColorToHex } from "../../src/lib/landing-pages/wcag";
import { resolveCtaHref } from "../../src/features/campaigns/components/canvas/medium/puck-templates/landing-page-from-structured";
import type { CanvasContextStack } from "../../src/lib/ai/canvas-context";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}

console.log("\ncolorAlpha");
assert("space/slash rgb met .1 → 0.1", colorAlpha("rgb(255 255 255 / .1)") === 0.1, String(colorAlpha("rgb(255 255 255 / .1)")));
assert("rgba komma met 0.5 → 0.5", colorAlpha("rgba(0,0,0,0.5)") === 0.5, String(colorAlpha("rgba(0,0,0,0.5)")));
assert("hsl slash 40% → 0.4", colorAlpha("hsl(120 50% 50% / 40%)") === 0.4, String(colorAlpha("hsl(120 50% 50% / 40%)")));
assert("8-digit hex #00000080 → ~0.5", Math.abs((colorAlpha("#00000080") ?? 0) - 128 / 255) < 0.001, String(colorAlpha("#00000080")));
assert("opaque 6-hex → 1", colorAlpha("#20A020") === 1);
assert("opaque rgb() → 1", colorAlpha("rgb(32 160 32)") === 1);
assert("transparent → 0", colorAlpha("transparent") === 0);
assert("var(...) → null (onmeetbaar)", colorAlpha("var(--bs-primary)") === null);

console.log("\nisWeakButtonBackground");
assert("translucent white (Better Brands) → weak", isWeakButtonBackground("rgb(255 255 255 / .1)") === true);
assert("rgba alpha 0 → weak", isWeakButtonBackground("rgba(0,0,0,0)") === true);
assert("alpha 0.3 → weak", isWeakButtonBackground("rgba(0,0,0,0.3)") === true);
assert("transparent → weak", isWeakButtonBackground("transparent") === true);
assert("null → weak", isWeakButtonBackground(null) === true);
assert("solide brand-groen → NIET weak", isWeakButtonBackground("#20A020") === false);
assert("solide rgb → NIET weak", isWeakButtonBackground("rgb(32 160 32)") === false);
assert("alpha 0.85 → NIET weak (dekkend genoeg)", isWeakButtonBackground("rgba(0,0,0,0.85)") === false);

console.log("\nnormalizeColorToHex (space/slash + 8-hex)");
assert("space/slash rgb → hex", normalizeColorToHex("rgb(255 255 255 / .1)") === "#ffffff", String(normalizeColorToHex("rgb(255 255 255 / .1)")));
assert("space rgb zonder alpha → hex", normalizeColorToHex("rgb(32 160 32)") === "#20a020", String(normalizeColorToHex("rgb(32 160 32)")));
assert("8-digit hex → 6-hex (alpha gedropt)", normalizeColorToHex("#20A020FF") === "#20a020", String(normalizeColorToHex("#20A020FF")));
assert("komma rgb blijft werken", normalizeColorToHex("rgb(0, 0, 0)") === "#000000");

console.log("\nresolveCtaHref");
const ctx = (url: unknown): CanvasContextStack =>
  ({ contentTypeInputs: url === undefined ? {} : { landingPageUrl: url } } as unknown as CanvasContextStack);
assert("https URL passeert", resolveCtaHref(ctx("https://betterbrands.nl/offer")) === "https://betterbrands.nl/offer");
assert("http URL passeert", resolveCtaHref(ctx("http://example.com")) === "http://example.com");
assert("root-relatief /aanmelden passeert", resolveCtaHref(ctx("/aanmelden")) === "/aanmelden");
assert("mailto passeert", resolveCtaHref(ctx("mailto:hi@x.nl")) === "mailto:hi@x.nl");
assert("tel passeert", resolveCtaHref(ctx("tel:+31612345678")) === "tel:+31612345678");
assert("leeg → #", resolveCtaHref(ctx("")) === "#");
assert("whitespace → #", resolveCtaHref(ctx("   ")) === "#");
assert("javascript: → # (geen XSS-lek)", resolveCtaHref(ctx("javascript:alert(1)")) === "#");
assert("naakte tekst → #", resolveCtaHref(ctx("plan een gesprek")) === "#");
assert("ontbrekende input → #", resolveCtaHref(ctx(undefined)) === "#");
assert("null ctx → #", resolveCtaHref(null) === "#");

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
