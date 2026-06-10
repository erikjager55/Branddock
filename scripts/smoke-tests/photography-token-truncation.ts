// Smoke — lp-feature-image-diversity Fase 0+1 (audit 2026-06-10).
//
// Verifieert de stijl-laag-sanering met Napkings ECHTE scraped photographyStyle
// als fixture: (a) R1-split — promptFragment is stijl-only, compositie apart,
// subjects als pool; (b) R2 — per-segment word-safe truncatie, geen mid-woord
// cut, geen analyzer-marker-residu; (c) R6 — negative-prompt-strategie per
// model (nano-banana → prompt-directive, flux → native param).
//
// Run: npx tsx scripts/smoke-tests/photography-token-truncation.ts
import { mapPhotographyTokens } from "../../src/lib/landing-pages/brand-tokens-v4-mappers";
import { DEFAULT_BRAND_TOKENS } from "../../src/lib/landing-pages/brand-tokens";
import { applyNegativePromptStrategy } from "../../src/lib/integrations/fal/fal-client";
import { buildNegativePrompt } from "../../src/lib/ai/image-quality/negative-prompts";

let pass = 0;
let fail = 0;
function assert(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  PASS ${label}`); }
  else { fail++; console.error(`  FAIL ${label}`); }
}
function group(title: string) { console.log(`\n── ${title}`); }

// Napkings echte scrape (DB BrandStyleguide cmq1dnnr8…, verbatim incl. markers).
const NAPKING_PHOTOGRAPHY = {
  mood: "OBSERVED: Clean, professional, and approachable. The hero image shows a confident chef in a real kitchen environment — authentic rather than overly styled. Natural lighting, neutral tones, organized workspace conveys reliability and professionalism.",
  composition: "OBSERVED: Subject centered with arms crossed in confident pose, shallow depth of field with kitchen equipment visible but softly blurred in background. Clean, uncluttered framing. RECOMMENDED: Use environmental portraits that show context",
  subjects: "RECOMMENDED: Real restaurant staff in working environments, close-ups of pristine textiles (folded napkins, pressed chef jackets), behind-the-scenes laundry operations, hands interacting with textiles",
};

group("R1-split — promptFragment is stijl-only");
{
  const t = mapPhotographyTokens(NAPKING_PHOTOGRAPHY, DEFAULT_BRAND_TOKENS.photography);
  assert("fragment bevat mood", t.promptFragment.includes("Photography mood:"));
  assert("fragment bevat GEEN compositie", !t.promptFragment.toLowerCase().includes("arms crossed"));
  assert("fragment bevat GEEN subjects-staart", !t.promptFragment.includes("Subjects:"));
  assert("compositionFragment apart aanwezig", Boolean(t.compositionFragment?.includes("Composition:")));
  assert("compositie zit in compositionFragment", Boolean(t.compositionFragment?.toLowerCase().includes("arms crossed")));
}

group("R2 — Subjects-pool overleeft (werd door slice(0,500) volledig afgekapt)");
{
  const t = mapPhotographyTokens(NAPKING_PHOTOGRAPHY, DEFAULT_BRAND_TOKENS.photography);
  assert("subjectPool niet leeg", t.subjectPool.length >= 3);
  const pool = t.subjectPool.join(" | ").toLowerCase();
  assert("pool bevat textiel-onderwerp", pool.includes("napkins") || pool.includes("textiles"));
  assert("pool bevat wasserij-onderwerp", pool.includes("laundry"));
  assert("pool-items zonder marker-residu", !pool.includes("recommended"));
}

group("R2 — word-safe truncatie + globale marker-strip");
{
  const longMood = `OBSERVED: ${"warm golden light with authentic atmosphere ".repeat(12)}RECOMMENDED: extra advies`;
  const t = mapPhotographyTokens(
    { mood: longMood, composition: null, subjects: null },
    DEFAULT_BRAND_TOKENS.photography,
  );
  assert("fragment binnen budget (≤200)", t.promptFragment.length <= 200);
  assert("eindigt op heel woord + punt", /[a-z]\.$/i.test(t.promptFragment));
  assert("geen OBSERVED-residu", !/observed:/i.test(t.promptFragment));
  assert("geen mid-string RECOMMENDED-residu", !/recommended:/i.test(t.promptFragment));
  assert("compositionFragment null zonder compositie", t.compositionFragment === null);
  assert("lege pool zonder subjects", t.subjectPool.length === 0);
}

group("R1 — null photographyStyle → fallback (gate-dicht pad)");
{
  const t = mapPhotographyTokens(null, DEFAULT_BRAND_TOKENS.photography);
  assert("fallback promptFragment leeg", t.promptFragment === "");
  assert("fallback pool leeg", t.subjectPool.length === 0);
}

group("R6 — negative-strategie: nano-banana → prompt-directive");
{
  const negative = buildNegativePrompt({
    brandImageryDonts: ["Don't use stock photos of generic 'happy restaurant workers' with forced smiles"],
  });
  const r = applyNegativePromptStrategy("fal-ai/nano-banana-pro", "A photo of textiles.", negative);
  assert("geen native param", r.nativeNegative === undefined);
  assert("directive in prompt gevouwen", r.prompt.includes("Avoid:"));
  assert("donts aanwezig in directive", r.prompt.includes("happy restaurant workers"));
  assert("defaults aanwezig in directive", r.prompt.includes("collage"));
}

group("R6 — negative-strategie: flux behoudt native param");
{
  const r = applyNegativePromptStrategy("fal-ai/flux-2-pro", "A photo.", "blurry, collage");
  assert("native param gezet", r.nativeNegative === "blurry, collage");
  assert("prompt ongewijzigd", r.prompt === "A photo.");
}

group("R6 — directive specifiek-eerst + word-safe cap (review-fix)");
{
  const huge = Array.from({ length: 120 }, (_, i) => `verboden onderwerp nummer ${i}`).join(", ");
  const r = applyNegativePromptStrategy("fal-ai/nano-banana-pro", "P.", huge);
  assert("directive gecapt (~1200)", r.prompt.length <= 1230);
  assert("eindigt op punt", r.prompt.endsWith("."));

  // Specifiek-eerst: donts + brief-avoid komen vóór de defaults zodat een cap
  // nooit eerst de meest specifieke negaties wegknipt.
  const negative = buildNegativePrompt({
    brandImageryDonts: ["geen geposeerde stockmensen"],
    userNegations: ["lege tafels"],
  });
  const ordered = applyNegativePromptStrategy("fal-ai/nano-banana-pro", "P.", negative);
  const iDont = ordered.prompt.indexOf("geen geposeerde stockmensen");
  const iNeg = ordered.prompt.indexOf("lege tafels");
  const iDefault = ordered.prompt.indexOf("collage");
  assert("dont vóór defaults", iDont >= 0 && iDefault > iDont);
  assert("userNegation vóór defaults", iNeg >= 0 && iDefault > iNeg);
}

group("R6 — budget-reservering: directive overleeft de model-cap (review-fix)");
{
  const longPrompt = "Editorial photograph of textiles. " + "warm natural light with authentic texture detail ".repeat(70);
  const negative = buildNegativePrompt({ brandImageryDonts: ["geen geposeerde stockmensen"] });
  const r = applyNegativePromptStrategy("fal-ai/nano-banana-pro", longPrompt, negative);
  assert("totaal binnen nano-banana-cap (3000)", r.prompt.length <= 3000);
  assert("directive aanwezig ondanks lange prompt", r.prompt.includes("geen geposeerde stockmensen"));
  assert("positive prompt word-safe getrimd", r.prompt.startsWith("Editorial photograph"));
}

group("R6 — geen negative → passthrough");
{
  const r = applyNegativePromptStrategy("fal-ai/nano-banana-pro", "P.", undefined);
  assert("prompt ongewijzigd", r.prompt === "P.");
  assert("geen native param", r.nativeNegative === undefined);
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
