/**
 * Smoke-test voor Fase 4 — landing-page 6 type-specifieke quality dimensies.
 *
 * Verifies evaluateLandingPageQuality():
 *  - Complete landing-page tree scoort hoog (>= 80) op alle dimensies
 *  - Hero clarity: ontbrekend hero = 0, partial = 30-65, compleet = 100
 *  - Hero clarity: AI-judge-injection overruled deterministische proxy
 *  - Single-CTA: identieke labels = 100, 2 verschillende = 60, 3+ = 20
 *  - Readability: difficult-words <=140 = 100, >280 = 0, lineair tussenin
 *  - Social proof: trust + testimonial = 100, één = 50, geen = 0
 *  - Anatomie: 6 verplichte sections aanwezig = 100, fractioneel anders
 *  - Objection coverage: 0/1-2/3-4/5+ FAQ items = 0/30/60/100
 *  - Objection: judge-category-count injection (1-2/3-4/5+ = 40/70/100)
 *  - Composite-gewichten 20/15/15/15/20/15 correct toegepast
 *  - shouldAutoIterate trigger bij composite < 70
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase10-quality-dimensions.ts
 */

import { evaluateLandingPageQuality } from "../../src/lib/landing-pages/landing-page-quality";
import type { PuckLikeData } from "../../src/lib/landing-pages/puck-data-flatten";

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

const SINGLE_CTA = "Start mijn proefperiode";

function buildCompleteTree(opts?: {
  ctaLabels?: string[];
  faqItemCount?: number;
  difficultWords?: number;
  omitHero?: boolean;
  omitTestimonial?: boolean;
  omitFaq?: boolean;
  omitFooter?: boolean;
}): PuckLikeData {
  const ctaLabels = opts?.ctaLabels ?? [SINGLE_CTA, SINGLE_CTA];
  const faqItemCount = opts?.faqItemCount ?? 5;
  const difficultWords = opts?.difficultWords ?? 50;

  const content: Array<{ type: string; props: Record<string, unknown> }> = [];

  if (!opts?.omitHero) {
    content.push({
      type: "BrandHero",
      props: {
        id: "h",
        headline: "Bespaar 5 uur per week",
        sub: "Voor productteams die snel willen schakelen en consistente brand-output willen.",
        ctaLabel: ctaLabels[0],
      },
    });
  }

  // Trust-strip (FeatureGrid #1)
  content.push({
    type: "FeatureGrid",
    props: {
      id: "fg1",
      columns: "3",
      features: [{ title: "Acme" }, { title: "Globex" }, { title: "Initech" }],
    },
  });

  // Features (FeatureGrid #2)
  const featureWords = generateWords(20, 4); // 20 normal-length words
  content.push({
    type: "FeatureGrid",
    props: {
      id: "fg2",
      columns: "3",
      features: [
        { title: "Snel", description: featureWords },
        { title: "Veilig", description: featureWords },
        { title: "Samen", description: featureWords },
      ],
    },
  });

  if (!opts?.omitTestimonial) {
    content.push({
      type: "Testimonial",
      props: {
        id: "t",
        quote: "We bespaarden 30 uur per maand.",
        author: "Jan Jansen, CEO bij Voorbeeld BV",
        personaId: "",
      },
    });
  }

  if (!opts?.omitFaq && faqItemCount > 0) {
    const items = Array.from({ length: faqItemCount }, (_, i) => ({
      question: `Vraag ${i + 1}?`,
      answer: `Antwoord ${i + 1}.`,
    }));
    content.push({
      type: "FAQ",
      props: { id: "f", items },
    });
  }

  // Inject extra difficult words via RichText if needed
  if (difficultWords > 0) {
    const longWord = "implementatieproces"; // 18 chars - difficult
    const text = Array(difficultWords).fill(longWord).join(" ");
    content.push({
      type: "RichText",
      props: { id: "rt", content: text },
    });
  }

  // CTAs (additional BrandCTAs beyond hero)
  for (let i = 1; i < ctaLabels.length; i++) {
    content.push({
      type: "BrandCTA",
      props: { id: `cta-${i}`, label: ctaLabels[i], href: "#", personaId: "" },
    });
  }

  if (!opts?.omitFooter) {
    content.push({
      type: "Footer",
      props: { id: "ft", companyName: "Brand", tagline: "", links: [] },
    });
  }

  return { root: { props: {} }, content };
}

function generateWords(count: number, avgLength: number): string {
  return Array(count).fill("woord".padEnd(avgLength, "x")).join(" ");
}

// ─── Tests ─────────────────────────────────────────────

group("Complete tree — alle dimensies hoog");
{
  const tree = buildCompleteTree();
  const result = evaluateLandingPageQuality({ data: tree });

  assert("composite >= 70 (threshold)", result.composite >= 70);
  assert("thresholdMet=true", result.thresholdMet);
  assert("shouldAutoIterate=false", !result.shouldAutoIterate);
  assert("heroClarity = 100 (alle 3 elementen)", result.dimensions.heroClarity === 100);
  assert("singleCtaDiscipline = 100", result.dimensions.singleCtaDiscipline === 100);
  assert("readability = 100 (50 difficult words)", result.dimensions.readability === 100);
  assert("socialProofPresence = 100", result.dimensions.socialProofPresence === 100);
  assert("anatomyCompleteness = 100", result.dimensions.anatomyCompleteness === 100);
  assert("objectionCoverage = 100 (5 FAQ items)", result.dimensions.objectionCoverage === 100);
}

group("Hero clarity dimensie");
{
  const tree = buildCompleteTree({ omitHero: true });
  const result = evaluateLandingPageQuality({ data: tree });
  assert("zonder hero → 0", result.dimensions.heroClarity === 0);
}
{
  // Partial hero: alleen headline
  const tree: PuckLikeData = {
    root: { props: {} },
    content: [
      { type: "BrandHero", props: { headline: "Test", sub: "", ctaLabel: "" } },
    ],
  };
  const result = evaluateLandingPageQuality({ data: tree });
  assert("hero alleen headline → 35", result.dimensions.heroClarity === 35);
}
{
  const tree = buildCompleteTree();
  const result = evaluateLandingPageQuality({ data: tree, heroClarityJudgeScore: 80 });
  assert("AI-judge-injection 80 → score 80", result.dimensions.heroClarity === 80);
}
{
  const tree = buildCompleteTree();
  const result = evaluateLandingPageQuality({ data: tree, heroClarityJudgeScore: 0.65 });
  assert("AI-judge 0.65 (decimal) → 65", result.dimensions.heroClarity === 65);
}

group("Single-CTA discipline dimensie");
{
  // Twee identieke CTAs
  const tree = buildCompleteTree({ ctaLabels: [SINGLE_CTA, SINGLE_CTA, SINGLE_CTA] });
  const result = evaluateLandingPageQuality({ data: tree });
  assert("alle CTAs identiek → 100", result.dimensions.singleCtaDiscipline === 100);
}
{
  const tree = buildCompleteTree({ ctaLabels: ["Start trial", "Andere CTA"] });
  const result = evaluateLandingPageQuality({ data: tree });
  assert("2 verschillende CTAs → 60", result.dimensions.singleCtaDiscipline === 60);
}
{
  const tree = buildCompleteTree({ ctaLabels: ["A", "B", "C"] });
  const result = evaluateLandingPageQuality({ data: tree });
  assert("3+ verschillende CTAs → 20", result.dimensions.singleCtaDiscipline === 20);
}
{
  const tree = buildCompleteTree({ ctaLabels: [] });
  const result = evaluateLandingPageQuality({ data: tree });
  assert("geen CTAs → 0", result.dimensions.singleCtaDiscipline === 0);
}

group("Readability dimensie");
{
  const tree = buildCompleteTree({ difficultWords: 100 });
  const result = evaluateLandingPageQuality({ data: tree });
  assert("100 difficult words → 100", result.dimensions.readability === 100);
}
{
  // Boundary test — fixture-tree heeft zelf ook ~3-5 difficult words in hero+features
  const tree = buildCompleteTree({ difficultWords: 130 });
  const result = evaluateLandingPageQuality({ data: tree });
  assert(
    "~130 difficult words (binnen healthy) → 100",
    result.dimensions.readability === 100,
    `actual=${result.dimensions.readability} dw=${result.signals.difficultWordCount}`,
  );
}
{
  const tree = buildCompleteTree({ difficultWords: 210 });
  const result = evaluateLandingPageQuality({ data: tree });
  // 210 injected + ~5 fixture = ~215, score = 100 - (75/140 * 100) ≈ 46
  assert(
    "210 difficult words → degraded (40-55 range)",
    result.dimensions.readability >= 40 && result.dimensions.readability <= 55,
    `actual=${result.dimensions.readability}`,
  );
}
{
  const tree = buildCompleteTree({ difficultWords: 280 });
  const result = evaluateLandingPageQuality({ data: tree });
  assert("280 difficult words → 0", result.dimensions.readability === 0);
}
{
  const tree = buildCompleteTree({ difficultWords: 350 });
  const result = evaluateLandingPageQuality({ data: tree });
  assert("350 difficult words → 0 (clamped)", result.dimensions.readability === 0);
}

group("Social proof presence dimensie");
{
  const tree = buildCompleteTree({ omitTestimonial: true });
  const result = evaluateLandingPageQuality({ data: tree });
  assert("alleen FeatureGrid trust → 50", result.dimensions.socialProofPresence === 50);
}
{
  // Geen FeatureGrid + geen Testimonial
  const tree: PuckLikeData = {
    root: { props: {} },
    content: [{ type: "BrandHero", props: { headline: "x", sub: "y", ctaLabel: "z" } }],
  };
  const result = evaluateLandingPageQuality({ data: tree });
  assert("noch trust noch testimonial → 0", result.dimensions.socialProofPresence === 0);
}

group("Anatomie-completeness dimensie");
{
  const tree = buildCompleteTree({ omitHero: true });
  const result = evaluateLandingPageQuality({ data: tree });
  // 5 van 6 verplicht aanwezig: FeatureGrid+Testimonial+FAQ+CTA+Footer (geen BrandHero)
  // CTA komt uit ctaLabels[1] dat we niet hebben gezet → check via builder
  assert(
    "zonder hero: anatomie < 100",
    result.dimensions.anatomyCompleteness < 100,
  );
}
{
  const tree = buildCompleteTree();
  const result = evaluateLandingPageQuality({ data: tree });
  assert("compleet: anatomie = 100", result.dimensions.anatomyCompleteness === 100);
}

group("Objection coverage dimensie");
{
  const tree = buildCompleteTree({ faqItemCount: 0, omitFaq: true });
  const result = evaluateLandingPageQuality({ data: tree });
  assert("0 FAQ → 0", result.dimensions.objectionCoverage === 0);
}
{
  const tree = buildCompleteTree({ faqItemCount: 2 });
  const result = evaluateLandingPageQuality({ data: tree });
  assert("2 FAQ → 30", result.dimensions.objectionCoverage === 30);
}
{
  const tree = buildCompleteTree({ faqItemCount: 4 });
  const result = evaluateLandingPageQuality({ data: tree });
  assert("4 FAQ → 60", result.dimensions.objectionCoverage === 60);
}
{
  const tree = buildCompleteTree({ faqItemCount: 6 });
  const result = evaluateLandingPageQuality({ data: tree });
  assert("6 FAQ → 100", result.dimensions.objectionCoverage === 100);
}
{
  const tree = buildCompleteTree();
  const result = evaluateLandingPageQuality({
    data: tree,
    objectionCategoriesJudgeCount: 3,
  });
  assert("AI-judge 3 categorieën → 70", result.dimensions.objectionCoverage === 70);
}
{
  const tree = buildCompleteTree();
  const result = evaluateLandingPageQuality({
    data: tree,
    objectionCategoriesJudgeCount: 5,
  });
  assert("AI-judge 5+ categorieën → 100", result.dimensions.objectionCoverage === 100);
}

group("Composite-gewichten (20/15/15/15/20/15)");
{
  // Tree met bekende dimensie-scores → composite handmatig narekenbaar
  // Met complete tree: alle 100 → composite = 100
  const tree = buildCompleteTree();
  const result = evaluateLandingPageQuality({ data: tree });
  assert("alle 100 → composite = 100", result.composite === 100);
}
{
  // Hero clarity 0, rest 100 → composite = 100 - 20 = 80
  const tree = buildCompleteTree({ omitHero: true });
  const result = evaluateLandingPageQuality({ data: tree });
  // anatomyCompleteness ook lager omdat hero ontbreekt
  // anatomie = 5/6 * 100 = ~83
  // composite = 0*0.20 + 100*0.15 + 100*0.15 + 100*0.15 + 83*0.20 + 100*0.15 = 76 of 77 (rounded)
  assert(
    "hero ontbreekt: composite tussen 70-80",
    result.composite >= 70 && result.composite < 85,
    `composite=${result.composite}`,
  );
}

group("shouldAutoIterate trigger");
{
  // Heel slechte tree
  const badTree: PuckLikeData = {
    root: { props: {} },
    content: [{ type: "BrandHero", props: { headline: "x", sub: "", ctaLabel: "" } }],
  };
  const result = evaluateLandingPageQuality({ data: badTree });
  assert("slechte tree → shouldAutoIterate=true", result.shouldAutoIterate);
  assert("slechte tree → composite < 70", result.composite < 70);
}
{
  const goodTree = buildCompleteTree();
  const result = evaluateLandingPageQuality({ data: goodTree });
  assert("goede tree → shouldAutoIterate=false", !result.shouldAutoIterate);
}

group("Signals propagated");
{
  const tree = buildCompleteTree();
  const result = evaluateLandingPageQuality({ data: tree });
  assert("signals.distinctCtas reflects deduped", result.signals.distinctCtas.length === 1);
  assert("signals.faqItemCount counts items", result.signals.faqItemCount === 5);
  assert("signals.components incl. BrandHero", (result.signals.components.BrandHero ?? 0) > 0);
}

// ─── Resultaat ─────────────────────────────────────────

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
console.log("=".repeat(50));

if (fail > 0) {
  process.exit(1);
}
