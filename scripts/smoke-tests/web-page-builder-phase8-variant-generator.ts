/**
 * Smoke-test voor Fase 2 — landing-page variant-generator (prompt + parser).
 *
 * Geen live Anthropic calls — alleen de pure delen:
 *  - buildLandingPageVariantPrompt: schema-mention, conditional secties (problem/pricing),
 *    brand-context block, persona block, locale, kritische regels aanwezig.
 *  - parseLandingPageVariantResponse: clean JSON, code-fenced JSON,
 *    JSON met prose-prefix, niet-JSON input, malformed JSON,
 *    schema-violating JSON.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase8-variant-generator.ts
 */

import {
  buildLandingPageVariantPrompt,
  parseLandingPageVariantResponse,
  type LandingPageGenerationParams,
} from "../../src/lib/landing-pages/variant-generator";

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`);
    fail++;
  }
}

function group(name: string): void {
  console.log(`\n${name}`);
}

// ─── Fixtures ──────────────────────────────────────────

const BASE_PARAMS: LandingPageGenerationParams = {
  brand: {
    brandName: "Branddock",
    brandPromise: "Schaal jouw merk-DNA in alle marketing-output.",
    brandToneOfVoice: "Direct, helder, geen jargon",
    brandColors: "#1FD1B2 primary, #0F172A secondary",
    targetAudience: "Marketing managers in B2B SaaS",
    industry: "B2B SaaS",
  },
  persona: {
    name: "Marketing Manager Mara",
    role: "Marketing Manager",
    painPoints: ["Te veel tools", "Inconsistente brand-voice", "Trage content-productie"],
    goals: ["Snellere campaigns", "Consistente merkboodschap"],
  },
  userPrompt: "Maak een landing-page voor de pilot-launch van Branddock waar prospects een gratis assessment kunnen aanvragen.",
};

const VALID_VARIANT_JSON = {
  hero: {
    headline: "Bouw jouw merk-strategie in 30 dagen",
    subhead: "AI-gedreven brand strategy die research-gevalideerd is, team-ready, en daadwerkelijk wordt uitgevoerd.",
    primaryCta: "Start gratis assessment",
  },
  trust: {
    type: "logos",
    items: [{ label: "Klant A" }, { label: "Klant B" }, { label: "Klant C" }],
  },
  problem: {
    heading: "Verlies je tijd aan brand-inconsistentie?",
    painBullets: [
      "Verschillende teams gebruiken verschillende voice",
      "Content drift weg van guidelines",
      "Tools werken niet samen",
    ],
    bridgingSentence: "Branddock injecteert merk-DNA in elke AI-call.",
  },
  features: {
    sectionHeading: "Waarom Branddock?",
    items: [
      { icon: "zap", heading: "Snel ingericht", body: "In 5 minuten draait je workspace." },
      { icon: "shield", heading: "EU-data", body: "GDPR-conform, alles binnen Europa." },
      { icon: "users", heading: "Team-features", body: "Samenwerken met merk-context die meereist." },
    ],
  },
  socialProof: {
    testimonials: [
      {
        quote: "We bespaarden 30 uur per maand aan brand-controle.",
        authorName: "Jan Jansen",
        authorRole: "Marketing Director",
        authorCompany: "Voorbeeld BV",
        outcome: "30u/maand bespaard",
      },
    ],
  },
  faq: {
    items: [
      { question: "Hoe lang duurt setup?", answer: "Minder dan 1 dag in de meeste workspaces." },
      { question: "Kan ik altijd weg?", answer: "Ja, maandelijks opzegbaar zonder vragen." },
      { question: "Hoe veilig is mijn data?", answer: "Encryptie in transit en rust, EU-only." },
      { question: "Welke integraties?", answer: "Slack, Notion, Linear voorlopig." },
      { question: "Is er een trial?", answer: "Ja, 14 dagen gratis zonder creditcard." },
    ],
  },
  finalCta: {
    heading: "Klaar om je merk-DNA te schalen?",
    riskReducer: "Geen creditcard nodig.",
    primaryCta: "Start gratis assessment",
  },
};

// ─── Tests: prompt-builder ─────────────────────────────

group("Prompt-builder — basis structuur");
{
  const prompt = buildLandingPageVariantPrompt(BASE_PARAMS);
  assert("system bevat schema-uitleg", prompt.system.includes("OUTPUT-SCHEMA"));
  assert("system bevat single-CTA discipline regel", /single-CTA discipline/i.test(prompt.system));
  assert("system bevat readability-gate", /5e-7e graders|readability/i.test(prompt.system));
  assert("system bevat JSON-only instructie", prompt.system.includes("JSON-ONLY"));
  assert("user bevat brand-naam", prompt.user.includes("Branddock"));
  assert("user bevat user-prompt", prompt.user.includes("pilot-launch"));
  assert("user bevat persona-naam", prompt.user.includes("Marketing Manager Mara"));
  assert("user bevat pijnpunten", prompt.user.includes("Inconsistente brand-voice"));
}

group("Prompt-builder — copy-laag P1/P4/P11 (verbeterplan)");
{
  const prompt = buildLandingPageVariantPrompt(BASE_PARAMS);
  // P1 — descriptieve header (5-seconden-test), 60 niet 44.
  assert("P1: headline descriptief + 5-seconden-test", /DESCRIPTIEF/i.test(prompt.system) && /5-seconden-test/i.test(prompt.system));
  assert("P1: headline-limiet 60 (niet stale 44)", prompt.system.includes("max 60 tekens") && !prompt.system.includes("max 44 tekens"));
  // P4 — feature-pilaren binden terug op de hero (PAS).
  assert("P4: feature-pilaren binden op hero-belofte", /pilaar van de hero-belofte/i.test(prompt.system));
  assert("P4: PAS-narratief doorlopende boog", /PAS-narratief/i.test(prompt.system));
  // P11 — laagdrempelige eerste CTA (micro-commitment).
  assert("P11: CTA = micro-commitment / laagdrempelige ask", /micro-commitment/i.test(prompt.system));
  assert("P11: subhead believability ≤25 woorden", /max ~25 woorden/i.test(prompt.system) && /GELOOFWAARDIG/i.test(prompt.system));
}

group("Prompt-builder — conditional secties");
{
  const withProblem = buildLandingPageVariantPrompt({ ...BASE_PARAMS, includeProblem: true });
  const withoutProblem = buildLandingPageVariantPrompt({ ...BASE_PARAMS, includeProblem: false });
  assert("includeProblem=true zet problem-sectie in schema", withProblem.system.includes('"problem"'));
  assert("includeProblem=false weert problem-sectie uit schema", !withoutProblem.system.includes('"problem"'));
}
{
  const withPricing = buildLandingPageVariantPrompt({ ...BASE_PARAMS, includePricing: true });
  const withoutPricing = buildLandingPageVariantPrompt({ ...BASE_PARAMS, includePricing: false });
  assert("includePricing=true zet pricing-sectie in schema", withPricing.system.includes('"pricing"'));
  assert("includePricing=false weert pricing-sectie uit schema", !withoutPricing.system.includes('"pricing"'));
}

group("Prompt-builder — locale");
{
  const nl = buildLandingPageVariantPrompt({ ...BASE_PARAMS, locale: "nl-NL" });
  const en = buildLandingPageVariantPrompt({ ...BASE_PARAMS, locale: "en-US" });
  assert("locale nl-NL in user-prompt", nl.user.includes("nl-NL"));
  assert("locale en-US in user-prompt", en.user.includes("en-US"));
  assert("default locale = nl-NL", buildLandingPageVariantPrompt(BASE_PARAMS).user.includes("nl-NL"));
}

group("Prompt-builder — graceful met missing context");
{
  const minimal = buildLandingPageVariantPrompt({
    brand: {},
    userPrompt: "Test",
  });
  assert("geen crash met lege brand-context", typeof minimal.user === "string");
  assert("fallback-tekst voor lege brand", minimal.user.includes("geen brand-context aangeleverd"));
  assert("fallback-tekst voor lege persona", minimal.user.includes("geen persona aangeleverd"));
}

group("Prompt-builder — persona.serialized (canvas-context shape)");
{
  // Fase 6a wiring: canvas-context PersonaContext heeft alleen {id, name, serialized};
  // generator moet de serialized-tekst in user-prompt opnemen voor brede context.
  const withSerialized = buildLandingPageVariantPrompt({
    brand: { brandName: "Branddock" },
    persona: {
      name: "Marketing Manager",
      serialized: "B2B marketeer 28-40 jaar, ervaren met SaaS-tools, frustreert op fragmentatie",
    },
    userPrompt: "Test",
  });
  assert(
    "persona.name in user-prompt",
    withSerialized.user.includes("Marketing Manager"),
  );
  assert(
    "persona.serialized opgenomen onder Beschrijving",
    withSerialized.user.includes("Beschrijving") && withSerialized.user.includes("B2B marketeer"),
  );
}
{
  // Backward-compat: structured persona fields blijven werken
  const structured = buildLandingPageVariantPrompt({
    brand: {},
    persona: {
      name: "Persona X",
      role: "Manager",
      painPoints: ["pijn-1", "pijn-2"],
      goals: ["doel-1"],
    },
    userPrompt: "Test",
  });
  assert("structured persona.role nog steeds gerendered", structured.user.includes("Manager"));
  assert("structured painPoints gerendered", structured.user.includes("pijn-1"));
  assert("structured goals gerendered", structured.user.includes("doel-1"));
}

// ─── Tests: response-parser ────────────────────────────

group("Response-parser — clean JSON");
{
  const result = parseLandingPageVariantResponse(JSON.stringify(VALID_VARIANT_JSON));
  assert("clean JSON valideert", result.success);
}

group("Response-parser — code-fenced JSON");
{
  const text = "```json\n" + JSON.stringify(VALID_VARIANT_JSON, null, 2) + "\n```";
  const result = parseLandingPageVariantResponse(text);
  assert("JSON in ```json fence valideert", result.success);
}
{
  const text = "```\n" + JSON.stringify(VALID_VARIANT_JSON) + "\n```";
  const result = parseLandingPageVariantResponse(text);
  assert("JSON in generic ``` fence valideert", result.success);
}

group("Response-parser — JSON met prose-leak");
{
  const text = `Hier is de landing-page:\n\n${JSON.stringify(VALID_VARIANT_JSON)}\n\nHoop dat dit helpt!`;
  const result = parseLandingPageVariantResponse(text);
  assert("JSON met prose-prefix+suffix valideert", result.success);
}

group("Response-parser — error-modes");
{
  const result = parseLandingPageVariantResponse("Geen JSON hier, alleen tekst.");
  assert("geen JSON-block rejects", !result.success);
}
{
  const result = parseLandingPageVariantResponse("{ this is not valid JSON ");
  assert("malformed JSON rejects", !result.success);
}
{
  const incomplete = { hero: { headline: "x", subhead: "y", primaryCta: "z" } };
  const result = parseLandingPageVariantResponse(JSON.stringify(incomplete));
  assert("schema-violating JSON rejects", !result.success);
}
{
  const cross = { ...VALID_VARIANT_JSON };
  cross.finalCta = { ...cross.finalCta, primaryCta: "Andere CTA" };
  const result = parseLandingPageVariantResponse(JSON.stringify(cross));
  assert("cross-field violation rejects (single-CTA)", !result.success);
}

group("Response-parser — geneste JSON-balanstelling");
{
  // JSON met geneste strings die } bevatten — moet niet vroegtijdig stoppen
  const v = JSON.parse(JSON.stringify(VALID_VARIANT_JSON));
  v.hero.subhead = "Een subhead met een } character erin in een string";
  const result = parseLandingPageVariantResponse(JSON.stringify(v));
  assert("} binnen string-waarde breekt parser niet", result.success);
}
{
  // Eerste { is in een prose-prefix sentence — parser moet die negeren? Nee, hij pakt eerste {
  // Maar als prose geen { bevat is het OK. Test: meerdere geneste { } niveaus.
  const text = JSON.stringify(VALID_VARIANT_JSON);
  const result = parseLandingPageVariantResponse(text);
  assert("diep geneste JSON valideert", result.success);
}

// ─── Resultaat ─────────────────────────────────────────

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
console.log("=".repeat(50));

if (fail > 0) {
  process.exit(1);
}
