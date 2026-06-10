// Smoke — lp-feature-image-diversity Fase 3: server-side feature-prompt-builder.
//
// Verifieert buildFeatureVisualPrompts: brief-gedreven onderwerpen, sceneType-
// templates, sibling-differentiatie, fallback met angle-rotatie + subjectPool-
// cue, avoid-doorvoer en per-slot seeds.
//
// Run: npx tsx scripts/smoke-tests/feature-visual-prompts.ts
import { buildFeatureVisualPrompts } from "../../src/lib/landing-pages/feature-visual-prompts";
import type { ImageBrief } from "../../src/lib/landing-pages/variant-schema";

let pass = 0;
let fail = 0;
function assert(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  PASS ${label}`); }
  else { fail++; console.error(`  FAIL ${label}`); }
}
function group(title: string) { console.log(`\n── ${title}`); }

const CTX = {
  brand: { brandImageryStyle: null, brandName: "Napking" },
  brandTokens: {
    photography: {
      mood: "Clean, professional, approachable",
      compositionStyle: null,
      subjectMatter: null,
      promptFragment: "Photography mood: Clean, professional, approachable.",
      compositionFragment: "Composition: Subject centered with arms crossed.",
      subjectPool: ["close-ups of pristine textiles", "laundry operations", "hands interacting with textiles"],
    },
  },
};

const BRIEFS: ImageBrief[] = [
  { subject: "Industriële wasmachine met witte doeken, display op 85 graden", sceneType: "object", composition: "frontaal zicht op display" },
  { subject: "Handen vouwen servetten op RVS-werkblad", sceneType: "process", composition: "close-up van de handeling", avoid: "gezichten in beeld" },
  { subject: "GOTS-label in de zoom van tafellinnen", sceneType: "detail", composition: "macro, zachte zijbelichting" },
  { subject: "Elektrische bestelbus voor restaurant", sceneType: "location", composition: "zijaanzicht, stedelijke context" },
];

group("Brief-gedreven prompts — onderwerp + scene-template + compositie");
{
  const slots = BRIEFS.map((b, i) => ({ index: i, heading: `H${i}`, body: `B${i}`, imageBrief: b }));
  const built = buildFeatureVisualPrompts(slots, "Textielbeheer voor restaurants", CTX);
  assert("4 prompts", built.length === 4);
  assert("prompt 0 bevat brief-subject", built[0].prompt.includes("Industriële wasmachine"));
  assert("prompt 0 bevat object-template", built[0].prompt.includes("still-life"));
  assert("prompt 1 bevat process-template (anti-pose)", built[1].prompt.includes("NO posed look"));
  assert("prompt 2 bevat detail-template", built[2].prompt.toLowerCase().includes("macro close-up"));
  assert("prompt 3 bevat location-template", built[3].prompt.includes("environmental"));
  assert("prompt 1 bevat compositie uit brief", built[1].prompt.includes("close-up van de handeling"));
}

group("R1 — geen compositie/subjects-staart uit de scrape in feature-prompts");
{
  const slots = BRIEFS.map((b, i) => ({ index: i, heading: `H${i}`, body: `B${i}`, imageBrief: b }));
  const built = buildFeatureVisualPrompts(slots, "X", CTX);
  for (const b of built) {
    if (b.prompt.includes("arms crossed")) { assert("GEEN scrape-compositie in prompt", false); break; }
  }
  assert("scrape-compositionFragment afwezig in alle 4", built.every((b) => !b.prompt.includes("arms crossed")));
  assert("mood-stijlfragment wél aanwezig", built.every((b) => b.prompt.includes("Photography mood:")));
}

group("R4 — sibling-differentiatie + unieke seeds");
{
  const slots = BRIEFS.map((b, i) => ({ index: i, heading: `H${i}`, body: `B${i}`, imageBrief: b }));
  const built = buildFeatureVisualPrompts(slots, "X", CTX);
  assert("prompt 0 noemt sibling-subjects", built[0].prompt.includes("GOTS-label") && built[0].prompt.includes("bestelbus"));
  assert("prompt 0 noemt eigen subject NIET als sibling", !built[0].prompt.includes("clearly different subject, setting and camera distance than the others: Industriële"));
  assert("set-instructie aanwezig", built.every((b) => b.prompt.includes("in one page set")));
  const seeds = new Set(built.map((b) => b.seed));
  assert("4 verschillende seeds", seeds.size === 4);
  assert("seeds binnen 32-bit range", built.every((b) => Number.isInteger(b.seed) && b.seed >= 0 && b.seed < 2_147_483_647));
}

group("Fallback zonder brief — angle-rotatie + pool-cue");
{
  const slots = [0, 1, 2, 3].map((i) => ({ index: i, heading: `Feature ${i}`, body: `Body ${i}`, imageBrief: null }));
  const built = buildFeatureVisualPrompts(slots, "Pagina-onderwerp", CTX);
  assert("fallback bevat heading-frame", built[0].prompt.includes('illustrating "Feature 0"'));
  assert("fallback bevat pageHeadline", built[0].prompt.includes("Pagina-onderwerp"));
  const angles = built.map((b) => b.prompt);
  assert("angle 0 != angle 1 (rotatie)", angles[0].includes("Macro material") && angles[1].includes("Hands-at-work"));
  assert("pool-cue als suggestie aanwezig", built[0].prompt.includes("optional inspiration"));
  assert("pool-cue roteert per index", built[1].prompt.includes("laundry operations"));
}

group("Avoid-doorvoer (→ userNegations) ");
{
  const slots = BRIEFS.map((b, i) => ({ index: i, heading: `H${i}`, body: `B${i}`, imageBrief: b }));
  const built = buildFeatureVisualPrompts(slots, "X", CTX);
  assert("avoid uit brief doorgegeven", built[1].avoid === "gezichten in beeld");
  assert("avoid null zonder brief-avoid", built[0].avoid === null);
}

group("Leeg ctx — geen crash, kale maar valide prompt");
{
  const built = buildFeatureVisualPrompts(
    [{ index: 0, heading: "H", body: "B", imageBrief: null }],
    "X",
    null,
  );
  assert("1 prompt zonder ctx", built.length === 1 && built[0].prompt.length > 40);
  assert("geen sibling-regel bij 1 slot", !built[0].prompt.includes("in one page set"));
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
