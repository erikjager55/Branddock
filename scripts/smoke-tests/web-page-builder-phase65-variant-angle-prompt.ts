/**
 * Smoke-test voor P3b — dynamische creative-angle in de variant-prompt.
 *
 * Wanneer een `angleInstruction` gezet is, gebruikt buildLandingPageVariantPrompt
 * dat als divergentie-frame (CREATIVE ANGLE) i.p.v. de generieke variantAxis
 * (VARIANT-INVALSHOEK). Zonder angle valt het terug op de axis.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase65-variant-angle-prompt.ts
 */
import { buildLandingPageVariantPrompt } from "../../src/lib/landing-pages/variant-generator";

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}

const baseParams = { brand: {}, userPrompt: "Verkoop horeca-textiel-service." };

console.log("\nangle-only → CREATIVE ANGLE-blok, geen axis-blok");
const angleP = buildLandingPageVariantPrompt({
  ...baseParams,
  angleInstruction: '## Creative Angle: "Cijfers & verlies"\n\n**Approach:** Open met % rejects en spoedkosten.',
});
assert("system bevat 'CREATIVE ANGLE'", angleP.system.includes("CREATIVE ANGLE"));
assert("system bevat het angle-label", angleP.system.includes("Cijfers & verlies"));
assert("system bevat NIET de generieke axis-kop", !angleP.system.includes("VARIANT-INVALSHOEK"));

console.log("\naxis-only → VARIANT-INVALSHOEK, geen CREATIVE ANGLE");
const axisP = buildLandingPageVariantPrompt({ ...baseParams, variantAxis: "problem-led" });
assert("system bevat 'VARIANT-INVALSHOEK'", axisP.system.includes("VARIANT-INVALSHOEK"));
assert("system bevat 'PROBLEM-LED'", axisP.system.includes("PROBLEM-LED"));
assert("system bevat NIET 'CREATIVE ANGLE'", !axisP.system.includes("CREATIVE ANGLE"));

console.log("\nangle + axis → angle wint (geen dubbel divergentie-frame)");
const bothP = buildLandingPageVariantPrompt({
  ...baseParams,
  angleInstruction: '## Creative Angle: "Vrijdagavond stress"\n\n**Approach:** Scène in de keuken op piek.',
  variantAxis: "benefit-led",
});
assert("angle aanwezig", bothP.system.includes("CREATIVE ANGLE") && bothP.system.includes("Vrijdagavond stress"));
assert("axis-blok onderdrukt (geen VARIANT-INVALSHOEK)", !bothP.system.includes("VARIANT-INVALSHOEK"));

console.log("\ngeen frame → geen van beide blokken");
const plain = buildLandingPageVariantPrompt(baseParams);
assert("geen CREATIVE ANGLE + geen VARIANT-INVALSHOEK", !plain.system.includes("CREATIVE ANGLE") && !plain.system.includes("VARIANT-INVALSHOEK"));

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
