/**
 * Smoke-test voor de card-fix — isCardContextMismatch.
 *
 * Een gescrapte PRODUCT_CARD uit een tégengestelde licht/donker-context dan de
 * sectie waar hij op staat (zwarthout: puur-zwarte card op de lichte feature-
 * sectie) wordt genegeerd → archetype-fallback. Verifieert de detector:
 *  - zwarte card op lichte sectie → mismatch (true)
 *  - witte card op lichte sectie → geen mismatch
 *  - subtiele licht-grijze card op wit → geen mismatch (alleen EXTREEM telt)
 *  - witte card op donkere sectie → mismatch (inverse)
 *  - donkere card op donkere sectie → geen mismatch (context klopt)
 *  - rgb()/3-digit hex genormaliseerd (niet als zwart gemeten)
 *  - onmeetbaar (gradient/null) → geen mismatch (respecteer scraped)
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase58-card-context.ts
 */
import { isCardContextMismatch } from "../../src/lib/landing-pages/wcag";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}

console.log("\nisCardContextMismatch — context-detectie");
// Zwarthout's echte case: PRODUCT_CARD #000000 op feature-sectie #F8F9FA.
assert("zwart op licht → mismatch", isCardContextMismatch("#000000", "#F8F9FA") === true);
assert("rgb(0,0,0) op rgb(248,249,250) → mismatch (genormaliseerd)", isCardContextMismatch("rgb(0,0,0)", "rgb(248,249,250)") === true);
assert("#212529 op #F8F9FA → mismatch (donkere card, lichte sectie)", isCardContextMismatch("#212529", "#F8F9FA") === true);

assert("wit op licht → geen mismatch", isCardContextMismatch("#FFFFFF", "#F8F9FA") === false);
assert("licht-grijs (#E9ECEF) op wit → geen mismatch (subtiel)", isCardContextMismatch("#E9ECEF", "#FFFFFF") === false);
assert("#6C757D mid-grijs op wit → geen mismatch (niet extreem)", isCardContextMismatch("#6C757D", "#FFFFFF") === false);

assert("wit op donker → mismatch (inverse)", isCardContextMismatch("#FFFFFF", "#212529") === true);
assert("donker op donker → geen mismatch (context klopt)", isCardContextMismatch("#1A1A1A", "#212529") === false);

assert("onmeetbare card-bg (gradient) → geen mismatch", isCardContextMismatch("linear-gradient(#000,#111)", "#FFFFFF") === false);
assert("null card-bg → geen mismatch", isCardContextMismatch(null, "#FFFFFF") === false);
assert("null sectie-bg → geen mismatch", isCardContextMismatch("#000000", null) === false);
assert("named color (transparent) → geen mismatch", isCardContextMismatch("transparent", "#FFFFFF") === false);

console.log(`\nTotal: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
