/**
 * Smoke-test voor P8 accent-reservering (60-30-10) — reserveAccentForHeading
 * + isCloseColor.
 *
 * Een kop-kleur die ≈ de merk-accent is wordt charcoal (de accent blijft voor
 * CTA's/stats); een kop met een eigen kleur blijft ongemoeid.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase59-accent-reservation.ts
 */
import { reserveAccentForHeading, isCloseColor, isLoudColor, safeHeadingColor, contrastRatio } from "../../src/lib/landing-pages/wcag";

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

console.log("\nisLoudColor + gedempt-accent over-reach guard (review-fix)");
assert("burnt-orange #E06000 → luid", isLoudColor("#E06000") === true);
assert("vibrant-blauw #0A58CA → luid", isLoudColor("#0A58CA") === true);
assert("luxe-goud #B59032 → NIET luid (gedempt)", isLoudColor("#B59032") === false);
assert("charcoal #212529 → NIET luid (neutraal)", isLoudColor("#212529") === false);
assert("near-wit #F8F9FA → NIET luid", isLoudColor("#F8F9FA") === false);
// Gedempt-goud accent-merk (LINFI): goud-gekleurde kop BLIJFT (niet charcoal).
assert("goud-kop bij gedempt-goud accent → BLIJFT (merk-fideliteit)", reserveAccentForHeading("#B59032", "#B59032", CHARCOAL) === "#B59032");

console.log("\nsafeHeadingColor — gegarandeerde contrast-clamp (systematisch, elke klant)");
{
  const CHARC = "#212529";
  // Lichte gescrapte kop op lichte sectie → MOET geclampt worden (>=3:1).
  const r1 = safeHeadingColor("#DDDDDD", ACCENT, CHARC, "#FFFFFF");
  assert("lichte kop (#DDD) op wit → contrast >= 3.0", contrastRatio(r1, "#FFFFFF") >= 3.0, `${r1} = ${contrastRatio(r1, "#FFFFFF").toFixed(2)}`);
  // Donkere gescrapte kop op donkere panel → geflipt naar leesbaar (>=3:1).
  const r2 = safeHeadingColor("#222222", ACCENT, CHARC, "#212529");
  assert("donkere kop op donkere panel → contrast >= 3.0", contrastRatio(r2, "#212529") >= 3.0, `${r2} = ${contrastRatio(r2, "#212529").toFixed(2)}`);
  // Loud-accent-kop op wit → gereserveerd naar charcoal, contrast ok.
  const r3 = safeHeadingColor(ACCENT, ACCENT, CHARC, "#FFFFFF");
  assert("loud-accent kop → niet de accent + contrast >= 3.0", r3 !== ACCENT && contrastRatio(r3, "#FFFFFF") >= 3.0);
  // Eigen donkere kop (niet-accent) op wit → behouden + leesbaar.
  const r4 = safeHeadingColor("#1A2B3C", "#0A58CA", CHARC, "#FFFFFF");
  assert("eigen donkere kop op wit → leesbaar (>= 3.0)", contrastRatio(r4, "#FFFFFF") >= 3.0);
  // null kop → onSurface fallback, leesbaar.
  const r5 = safeHeadingColor(null, ACCENT, CHARC, "#FFFFFF");
  assert("null kop → onSurface, contrast >= 3.0", contrastRatio(r5, "#FFFFFF") >= 3.0);
}

console.log(`\nTotal: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
