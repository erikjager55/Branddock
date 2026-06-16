/**
 * Smoke-test voor W5 — logo-garantie L-Fase 2 (plan §5):
 *
 *  - Feature-pad: visible-logo door de regeneratie-poort — zwaarste reden,
 *    library-beelden beschermd (échte logo toegestaan), backwards-compat
 *    voor callers zonder het veld, budget-cap intact.
 *  - Retry-aanscherping: hard no-logo-verbod + subject-anker + avoid-termen.
 *  - Hero-pad: decideHeroLogoSwap (auto-deselect naar schone variant) —
 *    drempel <50, hoogste schone variant wint, race-guard (hero-not-ours),
 *    geen schone variant → no-clean-variant (caller logt; bewust geen
 *    auto-refine: compose-refine voert brand-anchors = T2 terug in).
 *  - extractLogoFidelity: parse uit het gepersisteerde aiJudgeDimensions-JSON.
 *
 * Run: npx tsx scripts/smoke-tests/page-types-w5.ts
 */

import {
  decideFeatureRegenerations,
  COHERENCE_REGEN_THRESHOLD,
  MAX_REGENERATIONS_PER_PAGE,
} from "../../src/lib/landing-pages/feature-visual-gate";
import {
  sharpenFeaturePromptForRetry,
  type BuiltFeaturePrompt,
} from "../../src/lib/landing-pages/feature-visual-prompts";
import {
  decideHeroLogoSwap,
  extractLogoFidelity,
  HERO_LOGO_FIDELITY_THRESHOLD,
} from "../../src/lib/landing-pages/hero-logo-gate";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

// ─── A. Feature-gate: visible-logo ─────────────────────

group("A. decideFeatureRegenerations — visible-logo");

const logoDecision = decideFeatureRegenerations(
  [
    { index: 0, coherenceScore: 80, visibleLogo: true },
    { index: 1, coherenceScore: 85, visibleLogo: false },
    { index: 2, coherenceScore: 90, visibleLogo: null },
  ],
  [],
);
assert(
  "AI-beeld met logo → regen met reden visible-logo (coherence hoog genoeg)",
  logoDecision.regenerate.length === 1
    && logoDecision.regenerate[0] === 0
    && logoDecision.reasons.get(0) === "visible-logo",
);

const priorityDecision = decideFeatureRegenerations(
  [
    { index: 0, coherenceScore: 30, visibleLogo: false }, // low-coherence
    { index: 1, coherenceScore: 95, visibleLogo: true }, // visible-logo
    { index: 2, coherenceScore: 35, visibleLogo: false }, // low-coherence
  ],
  [],
  2,
);
assert(
  "visible-logo gaat vóór low-coherence binnen het budget",
  priorityDecision.regenerate[0] === 1 && priorityDecision.regenerate.length === 2,
  JSON.stringify(priorityDecision.regenerate),
);
assert(
  "tweede budget-slot = slechtste low-coherence",
  priorityDecision.regenerate[1] === 0,
);

const protectedDecision = decideFeatureRegenerations(
  [
    { index: 0, coherenceScore: 80, visibleLogo: true },
    { index: 1, coherenceScore: 85, visibleLogo: false },
  ],
  [],
  MAX_REGENERATIONS_PER_PAGE,
  new Set([0]),
);
assert(
  "library-beeld (protected) met logo → GEEN regen (échte logo toegestaan)",
  protectedDecision.regenerate.length === 0,
);

const compatDecision = decideFeatureRegenerations(
  [
    { index: 0, coherenceScore: 80 },
    { index: 1, coherenceScore: COHERENCE_REGEN_THRESHOLD - 1 },
  ],
  [],
);
assert(
  "caller zonder visibleLogo-veld → ongewijzigd gedrag (alleen low-coherence)",
  compatDecision.regenerate.length === 1 && compatDecision.reasons.get(1) === "low-coherence",
);

const bothDecision = decideFeatureRegenerations(
  [{ index: 0, coherenceScore: 20, visibleLogo: true }],
  [],
);
assert(
  "logo + lage coherence → reden visible-logo (logo-retry ankert óók het subject)",
  bothDecision.reasons.get(0) === "visible-logo",
);

const capDecision = decideFeatureRegenerations(
  [
    { index: 0, coherenceScore: 90, visibleLogo: true },
    { index: 1, coherenceScore: 90, visibleLogo: true },
    { index: 2, coherenceScore: 90, visibleLogo: true },
  ],
  [],
);
assert(
  `budget-cap blijft ${MAX_REGENERATIONS_PER_PAGE} bij 3 logo-flags`,
  capDecision.regenerate.length === MAX_REGENERATIONS_PER_PAGE,
);

// ─── B. Retry-aanscherping ─────────────────────────────

group("B. sharpenFeaturePromptForRetry — visible-logo");
const builtFixture: BuiltFeaturePrompt = {
  index: 2,
  prompt: "Editorial photograph of a stocked linen cupboard in a restaurant.",
  avoid: "clutter",
  seed: 1234,
};
const sharpened = sharpenFeaturePromptForRetry(builtFixture, {
  kind: "visible-logo",
  subject: "stocked linen cupboard",
});
assert(
  "prompt opent met hard no-logo-verbod + behoudt subject-anker",
  sharpened.prompt.startsWith("CRITICAL: the previous attempt contained a fabricated logo")
    && sharpened.prompt.includes("stocked linen cupboard")
    && sharpened.prompt.includes(builtFixture.prompt),
);
assert(
  "avoid uitgebreid met logo-termen (bestaande avoid blijft)",
  (sharpened.avoid ?? "").includes("logos, wordmarks, brand lettering") && (sharpened.avoid ?? "").includes("clutter"),
  sharpened.avoid ?? "null",
);
assert("retry krijgt een seed (number)", typeof sharpened.seed === "number");

// ─── C. Hero-gate: decideHeroLogoSwap ──────────────────

group("C. decideHeroLogoSwap");
const v = (componentId: string, url: string, logoFidelity: number | null) => ({ componentId, url, logoFidelity });

assert(
  "hero schoon (>= drempel) → none/hero-clean",
  decideHeroLogoSwap([v("a", "u-a", 90), v("b", "u-b", 95)], "u-a").action === "none"
    && (decideHeroLogoSwap([v("a", "u-a", 90)], "u-a") as { reason: string }).reason === "hero-clean",
);
assert(
  "hero ongescoord → none/hero-unscored (geen signaal, geen actie)",
  (decideHeroLogoSwap([v("a", "u-a", null), v("b", "u-b", 90)], "u-a") as { reason: string }).reason === "hero-unscored",
);
const swap = decideHeroLogoSwap(
  [v("a", "u-a", 20), v("b", "u-b", 75), v("c", "u-c", 95)],
  "u-a",
);
assert(
  "hero geflagd (<50) → swap naar HOOGSTE schone variant",
  swap.action === "swap" && swap.action === "swap" && swap.to.componentId === "c" && swap.from.componentId === "a",
);
assert(
  "drempel is exact 50 (49 flagt, 50 niet)",
  decideHeroLogoSwap([v("a", "u-a", 49), v("b", "u-b", 90)], "u-a").action === "swap"
    && decideHeroLogoSwap([v("a", "u-a", HERO_LOGO_FIDELITY_THRESHOLD), v("b", "u-b", 90)], "u-a").action === "none",
);
assert(
  "geen schone variant → none/no-clean-variant (geen auto-refine: T2)",
  (decideHeroLogoSwap([v("a", "u-a", 20), v("b", "u-b", 30)], "u-a") as { reason: string }).reason === "no-clean-variant",
);
assert(
  "race-guard: huidige hero is niet één van onze varianten → none/hero-not-ours",
  (decideHeroLogoSwap([v("a", "u-a", 20), v("b", "u-b", 90)], "https://user-koos-zelf.jpg") as { reason: string }).reason === "hero-not-ours",
);
assert(
  "lege varianten → none/no-variants",
  (decideHeroLogoSwap([], "u-a") as { reason: string }).reason === "no-variants",
);

// ─── D. extractLogoFidelity ────────────────────────────

group("D. extractLogoFidelity");
assert(
  "parset uit gepersisteerd aiJudgeDimensions-JSON",
  extractLogoFidelity({ composite: 80, dimensions: { "logo-fidelity": { score: 42, rationale: "x" } } }) === 42,
);
assert(
  "judge geskipt ({skipped:true}) → null",
  extractLogoFidelity({ skipped: true }) === null,
);
assert(
  "malformed/ontbrekend → null",
  extractLogoFidelity(null) === null
    && extractLogoFidelity("rommel") === null
    && extractLogoFidelity({ dimensions: { "logo-fidelity": { score: "hoog" } } }) === null,
);

// ─── Samenvatting ──────────────────────────────────────

console.log(`\n${"=".repeat(50)}`);
console.log(`TOTAAL: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
