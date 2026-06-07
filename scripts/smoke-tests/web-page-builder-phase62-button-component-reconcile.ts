/**
 * Smoke-test voor button-conformiteit (Better Brands-bevinding):
 *
 * 1. reconcileButtonWithComponent: de accurate StyleguideComponent BUTTON-card
 *    (computed-style) overschrijft de buttonProfile-afgeleide geometrie/stijl,
 *    zodat de LP-CTA 1-op-1 de Components-tab-button volgt i.p.v. archetype-
 *    presets. Geen card → ongewijzigd.
 * 2. contrastRatio is nu robuust voor niet-6-hex kleuren (rgb()/space-syntax/
 *    named) — voorheen werd `rgb(255, 255, 255)` als zwart (luminance 0) gemeten
 *    → witte tekst op een witte knop.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase62-button-component-reconcile.ts
 */
import { reconcileButtonWithComponent, type ComponentButtonLike } from "../../src/lib/landing-pages/brand-tokens-v4-mappers";
import { contrastRatio } from "../../src/lib/landing-pages/wcag";
import type { ButtonTokens } from "../../src/lib/landing-pages/brand-tokens";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}

// buttonProfile-afgeleide basis (rond, sans, 600 — typische preset-default).
const BASE: ButtonTokens = {
  paddingY: 14, paddingX: 28, radiusPx: 6, fontWeight: 600, fontSize: 16,
  textTransform: "none", letterSpacing: "0.01em", hoverStyle: "darken",
  background: "rgb(255 255 255 / .1)", color: "rgb(0 0 0 / 1)", fontFamily: null,
  border: null, transition: null, hoverBackground: null, hoverColor: null,
};

// Better Brands "Aanmelden" card: scherp, vet, omrand, dark-on-white.
const BB_CARD: ComponentButtonLike = {
  color: "rgb(0, 0, 0)", background: "rgb(255, 255, 255)", border: "2px solid rgb(0, 0, 0)",
  padding: "20px 40px", borderRadius: "0px", fontSize: "22px", fontWeight: "700",
  textTransform: null, letterSpacing: null, fontFamily: null,
};

console.log("\nreconcileButtonWithComponent — Better Brands outline-card wint");
const bb = reconcileButtonWithComponent(BASE, BB_CARD);
assert("radius 6→0 (scherp uit card)", bb.radiusPx === 0, String(bb.radiusPx));
assert("fontWeight 600→700", bb.fontWeight === 700, String(bb.fontWeight));
assert("fontSize 16→22", bb.fontSize === 22, String(bb.fontSize));
assert("paddingY 14→20 (shorthand)", bb.paddingY === 20, String(bb.paddingY));
assert("paddingX 28→40 (shorthand)", bb.paddingX === 40, String(bb.paddingX));
assert("border uit card (2px solid zwart)", bb.border === "2px solid rgb(0, 0, 0)", String(bb.border));
assert("background uit card (wit, niet translucent)", bb.background === "rgb(255, 255, 255)", String(bb.background));
assert("color uit card (zwart)", bb.color === "rgb(0, 0, 0)", String(bb.color));

console.log("\nreconcileButtonWithComponent — geen card → ongewijzigd");
const noChange = reconcileButtonWithComponent(BASE, null);
assert("identiek aan BASE", JSON.stringify(noChange) === JSON.stringify(BASE));

console.log("\nreconcileButtonWithComponent — 1-waarde padding-shorthand");
const onePad = reconcileButtonWithComponent(BASE, { ...BB_CARD, padding: "16px" });
assert("padding 16px → y=x=16", onePad.paddingY === 16 && onePad.paddingX === 16, `${onePad.paddingY}/${onePad.paddingX}`);

console.log("\nreconcileButtonWithComponent — var()/inherit genegeerd");
const dirty = reconcileButtonWithComponent(BASE, { ...BB_CARD, background: "var(--x)", color: "inherit" });
assert("var() background genegeerd → behoud base", dirty.background === BASE.background, String(dirty.background));
assert("inherit color genegeerd → behoud base", dirty.color === BASE.color, String(dirty.color));

console.log("\ncontrastRatio robuust voor niet-6-hex kleuren");
assert("rgb(255,255,255) vs rgb(0,0,0) ≈ 21 (niet 1)", Math.abs(contrastRatio("rgb(255, 255, 255)", "rgb(0, 0, 0)") - 21) < 0.1, String(contrastRatio("rgb(255, 255, 255)", "rgb(0, 0, 0)")));
assert("zwart op rgb(255,255,255) ≈ 21 (knop-tekst-fix)", Math.abs(contrastRatio("rgb(0, 0, 0)", "rgb(255, 255, 255)") - 21) < 0.1, String(contrastRatio("rgb(0, 0, 0)", "rgb(255, 255, 255)")));
assert("space-syntax rgb(32 160 32) vs wit > 1", contrastRatio("rgb(32 160 32)", "#ffffff") > 1.5);
assert("hex blijft werken (#000 vs #fff = 21)", Math.abs(contrastRatio("#000000", "#ffffff") - 21) < 0.1);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
