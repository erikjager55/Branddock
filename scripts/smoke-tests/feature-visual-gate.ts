// Smoke — lp-feature-image-diversity Fase 4: deterministische regeneratie-poort
// + retry-prompt-aanscherping.
//
// Run: npx tsx scripts/smoke-tests/feature-visual-gate.ts
import {
  decideFeatureRegenerations,
  COHERENCE_REGEN_THRESHOLD,
  MAX_REGENERATIONS_PER_PAGE,
} from "../../src/lib/landing-pages/feature-visual-gate";
import { sharpenFeaturePromptForRetry } from "../../src/lib/landing-pages/feature-visual-prompts";

let pass = 0;
let fail = 0;
function assert(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  PASS ${label}`); }
  else { fail++; console.error(`  FAIL ${label}`); }
}
function group(title: string) { console.log(`\n── ${title}`); }

group("Coherence-drempel");
{
  const d = decideFeatureRegenerations(
    [
      { index: 0, coherenceScore: 82 },
      { index: 1, coherenceScore: 35 },
      { index: 2, coherenceScore: COHERENCE_REGEN_THRESHOLD },
      { index: 3, coherenceScore: null },
    ],
    [],
  );
  assert("alleen score < 50 → regen", d.regenerate.length === 1 && d.regenerate[0] === 1);
  assert("reden = low-coherence", d.reasons.get(1) === "low-coherence");
  assert("score == drempel blijft staan", !d.regenerate.includes(2));
  assert("null-score (judge geskipt) → geen regen", !d.regenerate.includes(3));
}

group("Duplicate-paren — laagste coherence verliest");
{
  const d = decideFeatureRegenerations(
    [
      { index: 0, coherenceScore: 80 },
      { index: 1, coherenceScore: 60 },
    ],
    [[0, 1]],
  );
  assert("lid met laagste score regenereert", d.regenerate.length === 1 && d.regenerate[0] === 1);
  assert("reden = duplicate", d.reasons.get(1) === "duplicate");
}
{
  const d = decideFeatureRegenerations(
    [
      { index: 0, coherenceScore: null },
      { index: 1, coherenceScore: null },
    ],
    [[0, 1]],
  );
  assert("tie/onbekend → tweede lid (deterministisch)", d.regenerate[0] === 1);
}

group("Budget-cap + prioriteit low-coherence > duplicate");
{
  const d = decideFeatureRegenerations(
    [
      { index: 0, coherenceScore: 20 },
      { index: 1, coherenceScore: 40 },
      { index: 2, coherenceScore: 75 },
      { index: 3, coherenceScore: 70 },
    ],
    [[2, 3]],
  );
  assert(`cap op ${MAX_REGENERATIONS_PER_PAGE}`, d.regenerate.length === MAX_REGENERATIONS_PER_PAGE);
  assert("slechtste coherence eerst", d.regenerate[0] === 0 && d.regenerate[1] === 1);
  assert("duplicate valt buiten budget", !d.regenerate.includes(3));
  assert("reasons beperkt tot gecapte set", d.reasons.size === 2);
}

group("protectedIndices — library-slot nooit duplicate-verliezer (review 2026-06-11)");
{
  const prot = new Set([0]);
  const d = decideFeatureRegenerations(
    [
      { index: 0, coherenceScore: 56 },
      { index: 1, coherenceScore: 80 },
    ],
    [[0, 1]],
    undefined,
    prot,
  );
  assert("AI-partner verliest ondanks hogere coherence", d.regenerate.length === 1 && d.regenerate[0] === 1);
  const dBoth = decideFeatureRegenerations(
    [
      { index: 0, coherenceScore: 60 },
      { index: 1, coherenceScore: 70 },
    ],
    [[0, 1]],
    undefined,
    new Set([0, 1]),
  );
  assert("beide beschermd → geen regen voor dat paar", dBoth.regenerate.length === 0);
  const dLow = decideFeatureRegenerations(
    [{ index: 0, coherenceScore: 30 }],
    [],
    undefined,
    new Set([0]),
  );
  assert("bescherming geldt alleen voor duplicate-rol, niet voor low-coherence", dLow.regenerate.includes(0));
}

group("Budget 0 / lege input");
{
  const d0 = decideFeatureRegenerations([{ index: 0, coherenceScore: 10 }], [], 0);
  assert("budget 0 → niets", d0.regenerate.length === 0);
  const dEmpty = decideFeatureRegenerations([], []);
  assert("lege slots → niets", dEmpty.regenerate.length === 0);
  const dUnknownPair = decideFeatureRegenerations([{ index: 0, coherenceScore: 90 }], [[5, 6]]);
  assert("dupe-paar buiten slot-set genegeerd", dUnknownPair.regenerate.length === 0);
}

group("Retry-aanscherping (pure)");
{
  const base = { index: 1, prompt: "Editorial feature photograph: wasmachine.", avoid: "gezichten", seed: 123 };
  const low = sharpenFeaturePromptForRetry(base, { kind: "low-coherence", subject: "industriële wasmachine", rationale: "image shows a chef instead" });
  assert("low-coherence: CRITICAL-subject vooraan", low.prompt.startsWith("CRITICAL: the photograph must literally"));
  assert("low-coherence: judge-feedback meegenomen", low.prompt.includes("chef instead"));
  assert("nieuwe seed", low.seed !== base.seed);
  const dup = sharpenFeaturePromptForRetry(base, { kind: "duplicate", otherSubject: "chef met gekruiste armen" });
  assert("duplicate: differentiatie-instructie geappend", dup.prompt.includes("clearly DIFFERENT subject"));
  assert("duplicate: avoid uitgebreid", Boolean(dup.avoid?.includes("near-duplicate of: chef met gekruiste armen")));
  assert("duplicate: bestaande avoid behouden", Boolean(dup.avoid?.includes("gezichten")));
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
