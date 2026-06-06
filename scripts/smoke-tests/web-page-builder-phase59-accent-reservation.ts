/**
 * Smoke-test voor P8 accent-reservering (60-30-10) — reserveAccentForHeading
 * + isCloseColor.
 *
 * Een kop-kleur die ≈ de merk-accent is wordt charcoal (de accent blijft voor
 * CTA's/stats); een kop met een eigen kleur blijft ongemoeid.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase59-accent-reservation.ts
 */
import { reserveAccentForHeading, isCloseColor } from "../../src/lib/landing-pages/wcag";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}

const ACCENT = "#E06000";
const CHARCOAL = "#212529";

console.log("\nisCloseColor");
assert("identieke hex → close", isCloseColor("#E06000", "#E06000") === true);
assert("gescrapte orange (#EA5B0D) ≈ accent (#E06000) → close", isCloseColor("#EA5B0D", "#E06000") === true);
assert("rgb(234,91,13) ≈ #E06000 → close (genormaliseerd)", isCloseColor("rgb(234,91,13)", "#E06000") === true);
assert("charcoal ≠ orange → niet close", isCloseColor("#212529", "#E06000") === false);
assert("onmeetbaar → niet close", isCloseColor("transparent", "#E06000") === false);

console.log("\nreserveAccentForHeading");
assert("accent-gekleurde kop → charcoal (gereserveerd)", reserveAccentForHeading(ACCENT, ACCENT, CHARCOAL) === CHARCOAL);
assert("gescrapte orange kop ≈ accent → charcoal", reserveAccentForHeading("#EA5B0D", ACCENT, CHARCOAL) === CHARCOAL);
assert("eigen donkere kop-kleur → blijft", reserveAccentForHeading("#1A2B3C", ACCENT, CHARCOAL) === "#1A2B3C");
assert("null kop → onSurface fallback", reserveAccentForHeading(null, ACCENT, CHARCOAL) === CHARCOAL);
assert("undefined kop → onSurface fallback", reserveAccentForHeading(undefined, ACCENT, CHARCOAL) === CHARCOAL);
// Een blauwe accent-brand: blauwe kop → charcoal; oranje (niet-accent) kop blijft.
assert("blauwe kop bij blauwe accent → charcoal", reserveAccentForHeading("#0A58CA", "#0A58CA", CHARCOAL) === CHARCOAL);
assert("niet-accent kleur bij blauwe accent → blijft", reserveAccentForHeading("#E06000", "#0A58CA", CHARCOAL) === "#E06000");

console.log(`\nTotal: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
