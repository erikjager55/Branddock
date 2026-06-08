/**
 * [DET] Phase 66 — P3a: configureerbaar aantal landingspagina-varianten (1-4).
 *
 * Test de pure count-keyed laag (zonder AI-calls): temperatures + fallback-assen
 * per count, de angle-generator schema/prompt per count, en dat de bestaande
 * axis-waarden (story-led/data-led/emotional) een geldig VARIANT-INVALSHOEK-blok
 * produceren in de LP-prompt.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase66-variant-count.ts
 */
import {
  variantTemperatures,
  fallbackAxes,
  buildLandingPageVariantPrompt,
  generateLandingPageVariantBatch,
} from "../../src/lib/landing-pages/variant-generator";
import {
  buildAngleSystemPrompt,
  buildAngleSchema,
} from "../../src/lib/ai/canvas-angle-generator";

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

console.log("\nvariantTemperatures — lengte === count, gespreid (geen dup)");
for (const n of [1, 2, 3, 4]) {
  const t = variantTemperatures(n);
  assert(`count=${n} → ${n} temps`, t.length === n, JSON.stringify(t));
  assert(`count=${n} → unieke temps`, new Set(t).size === n, JSON.stringify(t));
}
assert("count=4 → [0.25,0.45,0.65,0.85]", eq(variantTemperatures(4), [0.25, 0.45, 0.65, 0.85]));

console.log("\nfallbackAxes — exacte assen per count");
assert("count=2 → problem/benefit", eq(fallbackAxes(2), ["problem-led", "benefit-led"]));
assert("count=3 → +story-led", eq(fallbackAxes(3), ["problem-led", "benefit-led", "story-led"]));
assert("count=4 → +data-led+emotional", eq(fallbackAxes(4), ["problem-led", "benefit-led", "data-led", "emotional"]));
assert("count=1 → enkel user-axis", eq(fallbackAxes(1, "rational"), ["rational"]));
assert("count=1 zonder axis → [null]", eq(fallbackAxes(1), [null]));
assert("alle count=4-assen zijn uniek", new Set(fallbackAxes(4)).size === 4);

console.log("\nbuildAngleSystemPrompt — count-bewust");
const sp3 = buildAngleSystemPrompt(3);
assert("count=3 → '3 fundamenteel verschillende'", sp3.includes("3 fundamenteel verschillende"));
assert("count=3 → 'exact 3 angles'", sp3.includes("exact 3 angles"));
assert("count=3 → POLARISATIE-REGEL", sp3.includes("POLARISATIE-REGEL"));
const sp1 = buildAngleSystemPrompt(1);
assert("count=1 → 'één heldere'", sp1.includes("één heldere, uitgesproken creative angle"));
assert("count=1 → 'exact 1 angle' (geen meervoud)", sp1.includes("exact 1 angle.") && !sp1.includes("exact 1 angles"));
assert("count=1 → KIES POSITIE i.p.v. POLARISATIE", sp1.includes("KIES POSITIE") && !sp1.includes("POLARISATIE-REGEL"));

console.log("\nbuildAngleSchema — strikt N items");
assert("schema(3) min/max === 3", buildAngleSchema(3).properties.angles.minItems === 3 && buildAngleSchema(3).properties.angles.maxItems === 3);
assert("schema(2) min/max === 2", buildAngleSchema(2).properties.angles.minItems === 2 && buildAngleSchema(2).properties.angles.maxItems === 2);
assert("schema(4) min/max === 4", buildAngleSchema(4).properties.angles.minItems === 4 && buildAngleSchema(4).properties.angles.maxItems === 4);

console.log("\nnieuwe fallback-assen → geldig VARIANT-INVALSHOEK-blok in LP-prompt");
const base = { brand: {}, userPrompt: "Verkoop horeca-textiel-service." };
for (const ax of ["story-led", "data-led", "emotional"] as const) {
  const p = buildLandingPageVariantPrompt({ ...base, variantAxis: ax });
  assert(`axis=${ax} → VARIANT-INVALSHOEK ${ax.toUpperCase()}`, p.system.includes("VARIANT-INVALSHOEK") && p.system.includes(ax.toUpperCase()));
}

void (async () => {
  console.log("\ngenerateLandingPageVariantBatch — integer-guard (defense-in-depth)");
  const bad: number = 2.5;
  let threw = false;
  try {
    await generateLandingPageVariantBatch({ brand: {}, userPrompt: "test" }, bad as 1 | 2 | 3 | 4);
  } catch (e) {
    threw = e instanceof Error && /integer 1-4/.test(e.message);
  }
  assert("count=2.5 → throw vóór AI-call (integer-guard)", threw);

  console.log(`\n${pass} PASS / ${fail} FAIL`);
  if (fail > 0) process.exit(1);
})();
