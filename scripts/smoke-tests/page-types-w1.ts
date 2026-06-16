/**
 * Smoke-test voor W1 — type-aware structured generation voor de website-
 * page-types (plan docs/specs/website-page-types-implementatieplan.md).
 *
 * Verifies:
 *  - Per-type Zod-schemas (faq/product/microsite): valid fixtures parsen,
 *    structurele violaties (te weinig items, CTA-mismatch) rejecten
 *  - Schema-dispatch: getVariantSchemaForType / hasOwnVariantSchema /
 *    isLandingPageVariant (LP + comparison-page + unknown → LP, byte-compat)
 *  - From-structured builders: sectie-volgorde, hero-zonder-CTA (faq),
 *    FAQ-heading-prop, conditional secties (product optionals), FeatureSplit
 *    bij volledige beeld-vulling, brand-image fill, microsite-ankers
 *    (AnchorNav-links ↔ StoryChapter/BrandCTA anchorIds, slug-dedup), één
 *    RichText per hoofdstuk, stat→StatsBlock + quote→Testimonial
 *  - variantToPuckDataFromStructured shape-dispatch (LP-tree ongewijzigd)
 *  - Legacy microsite-seed-template heeft GEEN dubbele RichText meer (W0-B)
 *  - flattenPageVariantToText shape-dispatch + LP fall-through
 *
 * Run: npx tsx scripts/smoke-tests/page-types-w1.ts
 */

import {
  faqPageVariantSchema,
  productPageVariantSchema,
  micrositeVariantSchema,
  getVariantSchemaForType,
  hasOwnVariantSchema,
  isLandingPageVariant,
  type FaqPageVariantContent,
  type ProductPageVariantContent,
  type MicrositeVariantContent,
} from "../../src/lib/landing-pages/page-type-schemas";
import { landingPageVariantSchema, type LandingPageVariantContent } from "../../src/lib/landing-pages/variant-schema";
import { flattenVariantToText, flattenPageVariantToText } from "../../src/lib/landing-pages/flatten-variant";
import { buildFaqPageTemplateFromStructured } from "../../src/features/campaigns/components/canvas/medium/puck-templates/faq-page-from-structured";
import { buildProductPageTemplateFromStructured } from "../../src/features/campaigns/components/canvas/medium/puck-templates/product-page-from-structured";
import { buildMicrositeTemplateFromStructured } from "../../src/features/campaigns/components/canvas/medium/puck-templates/microsite-from-structured";
import { buildMicrositeTemplate } from "../../src/features/campaigns/components/canvas/medium/puck-templates/microsite";
import { slugifyAnchor } from "../../src/features/campaigns/components/canvas/medium/puck-templates/from-structured-shared";
import { variantToPuckDataFromStructured } from "../../src/features/campaigns/components/canvas/medium/variant-to-puck-data";
import type { FilledFields } from "../../src/features/campaigns/components/canvas/medium/puck-templates";
import type { CanvasContextStack } from "../../src/lib/ai/canvas-context";

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

type Section = { type: string; props: Record<string, unknown> };
const sectionTypes = (data: { content: unknown }): string[] =>
  (data.content as Section[]).map((s) => s.type);
const sectionsOf = (data: { content: unknown }, type: string): Section[] =>
  (data.content as Section[]).filter((s) => s.type === type);

// ─── Fixtures ──────────────────────────────────────────

const qa = (n: number) => ({ question: `Vraag ${n}?`, answer: `Antwoord op vraag ${n}, volledig in de eerste zin.` });

const faqFixture: FaqPageVariantContent = {
  hero: { headline: "We helpen je graag", subline: "De antwoorden op wat klanten ons het vaakst vragen." },
  popularQuestions: [qa(1), qa(2), qa(3)],
  categories: [
    { label: "Bestellen & betalen", items: [qa(4), qa(5), qa(6)] },
    { label: "Levering & retour", items: [qa(7), qa(8), qa(9)] },
  ],
  contactEscape: {
    heading: "Staat je vraag er niet bij?",
    body: "Ons team antwoordt binnen 24 uur.",
    ctaLabel: "Neem contact op",
  },
  closingCta: { heading: "Klaar om te starten?", ctaLabel: "Plan een demo" },
};

const productFixtureMinimal: ProductPageVariantContent = {
  hero: {
    headline: "Genereer sneller inkomsten",
    subline: "Zonder maandenlange implementatie of verborgen kosten.",
    primaryCta: "Start vandaag",
  },
  problem: { heading: "Handwerk remt je af", body: "Teams verliezen uren aan repetitieve taken." },
  solution: { heading: "Eén platform dat het overneemt", body: "Automatiseer de hele keten in een middag." },
  features: [
    { heading: "Snel ingericht", body: "In 5 minuten live." },
    { heading: "Veilig", body: "EU-data, GDPR-conform." },
    { heading: "Schaalbaar", body: "Groeit mee met je team." },
  ],
  faq: [qa(1), qa(2), qa(3)],
  finalCta: {
    heading: "Klaar om te versnellen?",
    body: "Geen creditcard nodig.",
    primaryCta: "Start vandaag",
  },
};

const productFixtureFull: ProductPageVariantContent = {
  ...productFixtureMinimal,
  features: productFixtureMinimal.features.map((f, i) => ({
    ...f,
    imageUrl: `https://example.com/feature-${i}.jpg`,
  })),
  useCases: [
    { heading: "Voor agencies", body: "Beheer alle klanten in één workspace." },
    { heading: "Voor in-house teams", body: "Eén merkbron voor alle kanalen." },
  ],
  specs: [
    { label: "Materiaal", value: "Gerecycled aluminium" },
    { label: "Gewicht", value: "1,2 kg" },
  ],
  processSteps: [
    { heading: "Kennismaking", body: "We brengen je merk in kaart." },
    { heading: "Inrichting", body: "Wij zetten de workspace op." },
    { heading: "Livegang", body: "Je team gaat zelfstandig aan de slag." },
  ],
  pricing: { heading: "Transparante prijzen", body: "Vanaf € 49 per maand, maandelijks opzegbaar." },
};

const chapterBlocks = [
  { body: "Het begon met een simpele vraag: waarom bezitten we zoveel dat we zelden gebruiken?" },
  { heading: "De kanteling", body: "Toegang blijkt waardevoller dan bezit, voor mens én planeet." },
];

const micrositeFixture: MicrositeVariantContent = {
  heroManifest: {
    navLabel: "Start",
    headline: "Toegang is het nieuwe bezit",
    subline: "Een campagne over delen in plaats van kopen.",
    primaryCta: "Doe mee",
  },
  story: {
    navLabel: "Verhaal",
    heading: "Ons verhaal",
    intro: "Waarom we deze campagne zijn gestart.",
    blocks: chapterBlocks,
    stat: { value: "410+", context: "huishoudens delen al" },
    quote: { text: "Ik gebruik de boormachine van de buren — en dat voelt logisch.", attribution: "Deelnemer uit Utrecht" },
  },
  impact: {
    navLabel: "Impact",
    heading: "Wat het oplevert",
    blocks: chapterBlocks,
  },
  community: null,
  join: {
    navLabel: "Meedoen",
    heading: "Doe mee vóór 1 juli",
    body: "Meld je huishouden aan en deel mee.",
    primaryCta: "Meld je aan",
    deadline: "Aanmelden kan tot 1 juli",
  },
};

const lpFixture: LandingPageVariantContent = {
  hero: { headline: "Bespaar 5 uur per week", subhead: "Voor teams die snel schakelen.", primaryCta: "Start nu" },
  trust: { type: "logos", items: [{ label: "Acme" }, { label: "Globex" }, { label: "Initech" }] },
  features: {
    sectionHeading: "Waarom dit werkt",
    items: [
      { icon: "zap", heading: "Snel", body: "In 5 minuten live." },
      { icon: "shield", heading: "Veilig", body: "GDPR-conform." },
      { icon: "users", heading: "Samen", body: "Team-features ingebakken." },
    ],
  },
  socialProof: {
    testimonials: [
      { quote: "We bespaarden 30 uur per maand.", authorName: "Jan Jansen", authorRole: "CEO", authorCompany: "Voorbeeld BV", outcome: "30u/maand" },
    ],
  },
  faq: { items: [qa(1), qa(2), qa(3), qa(4), qa(5)] },
  finalCta: { heading: "Klaar om te starten?", primaryCta: "Start nu", riskReducer: "Geen creditcard nodig" },
} as LandingPageVariantContent;

// ─── A. Schema-validatie ───────────────────────────────

group("A. Per-type schema-validatie");
assert("faq: valid fixture parset", faqPageVariantSchema.safeParse(faqFixture).success);
assert(
  "faq: 2 popularQuestions rejected (min 3)",
  !faqPageVariantSchema.safeParse({ ...faqFixture, popularQuestions: [qa(1), qa(2)] }).success,
);
assert(
  "faq: categorie-label > 40 tekens rejected",
  !faqPageVariantSchema.safeParse({
    ...faqFixture,
    categories: [{ label: "x".repeat(41), items: [qa(1), qa(2), qa(3)] }],
  }).success,
);
assert("product: minimal fixture parset", productPageVariantSchema.safeParse(productFixtureMinimal).success);
assert("product: full fixture (alle optionals) parset", productPageVariantSchema.safeParse(productFixtureFull).success);
assert(
  "product: finalCta.primaryCta ≠ hero.primaryCta rejected (single-CTA)",
  !productPageVariantSchema.safeParse({
    ...productFixtureMinimal,
    finalCta: { ...productFixtureMinimal.finalCta, primaryCta: "Iets anders" },
  }).success,
);
assert(
  "product: 1 spec-rij rejected (min 2 wanneer aanwezig)",
  !productPageVariantSchema.safeParse({
    ...productFixtureMinimal,
    specs: [{ label: "Gewicht", value: "1 kg" }],
  }).success,
);
assert("microsite: fixture parset", micrositeVariantSchema.safeParse(micrositeFixture).success);
assert(
  "microsite: 1 chapter-block rejected (min 2)",
  !micrositeVariantSchema.safeParse({
    ...micrositeFixture,
    story: { ...micrositeFixture.story, blocks: [chapterBlocks[0]] },
  }).success,
);
assert("LP: fixture parset (referentie)", landingPageVariantSchema.safeParse(lpFixture).success);

// ─── B. Dispatch-helpers ───────────────────────────────

group("B. Schema-dispatch + type-guards");
assert("getVariantSchemaForType faq-page", getVariantSchemaForType("faq-page") === faqPageVariantSchema);
assert("getVariantSchemaForType product-page", getVariantSchemaForType("product-page") === productPageVariantSchema);
assert("getVariantSchemaForType microsite", getVariantSchemaForType("microsite") === micrositeVariantSchema);
assert("getVariantSchemaForType landing-page → LP", getVariantSchemaForType("landing-page") === landingPageVariantSchema);
assert("getVariantSchemaForType comparison-page → LP (W1 out-of-scope)", getVariantSchemaForType("comparison-page") === landingPageVariantSchema);
assert("getVariantSchemaForType null → LP", getVariantSchemaForType(null) === landingPageVariantSchema);
assert(
  "hasOwnVariantSchema: 3× true, LP/comparison/null false",
  hasOwnVariantSchema("faq-page") && hasOwnVariantSchema("product-page") && hasOwnVariantSchema("microsite")
    && !hasOwnVariantSchema("landing-page") && !hasOwnVariantSchema("comparison-page") && !hasOwnVariantSchema(null),
);
assert("isLandingPageVariant: LP true", isLandingPageVariant(lpFixture));
assert(
  "isLandingPageVariant: faq/product/microsite false",
  !isLandingPageVariant(faqFixture) && !isLandingPageVariant(productFixtureMinimal) && !isLandingPageVariant(micrositeFixture),
);

// ─── C. FAQ-builder ────────────────────────────────────

group("C. buildFaqPageTemplateFromStructured");
const faqTree = buildFaqPageTemplateFromStructured(faqFixture, null);
assert(
  // W3: ≥2 categorieën → jump-nav prepended; W4: sticky AnchorNav met scroll-spy.
  "sectie-volgorde nav → hero → popular → 2 categorieën → 2 CTA's → footer",
  sectionTypes(faqTree).join(",") === "AnchorNav,BrandHero,FAQ,FAQ,FAQ,BrandCTA,BrandCTA,Footer",
  sectionTypes(faqTree).join(","),
);
const faqHero = sectionsOf(faqTree, "BrandHero")[0];
assert("hero zonder CTA (lege ctaLabel)", faqHero.props.ctaLabel === "");
const faqBlocks = sectionsOf(faqTree, "FAQ");
assert("populaire vragen eerst met vaste heading", faqBlocks[0].props.heading === "Meest gestelde vragen");
assert(
  "popular-blok bevat de 3 popularQuestions",
  Array.isArray(faqBlocks[0].props.items) && (faqBlocks[0].props.items as unknown[]).length === 3,
);
assert("categorie-label wordt FAQ-heading", faqBlocks[1].props.heading === "Bestellen & betalen" && faqBlocks[2].props.heading === "Levering & retour");
const faqCtas = sectionsOf(faqTree, "BrandCTA");
assert(
  "contactEscape: heading + body (riskReducer) + ctaLabel",
  faqCtas[0].props.heading === faqFixture.contactEscape.heading
    && faqCtas[0].props.riskReducer === faqFixture.contactEscape.body
    && faqCtas[0].props.label === faqFixture.contactEscape.ctaLabel,
);
assert("closingCta als laatste CTA", faqCtas[1].props.heading === faqFixture.closingCta.heading);
assert("footer brandName-fallback bij null ctx", sectionsOf(faqTree, "Footer")[0].props.companyName === "Brand Name");
assert(
  "band-ritmiek afwisselend op FAQ-blokken",
  faqBlocks[0].props.bandTone === "base" && faqBlocks[1].props.bandTone === "alt" && faqBlocks[2].props.bandTone === "base",
);

// ─── D. Product-builder ────────────────────────────────

group("D. buildProductPageTemplateFromStructured");
const productTreeMin = buildProductPageTemplateFromStructured(productFixtureMinimal, null);
assert(
  "minimal: hero → problem → solution → features-grid → faq → cta → footer",
  sectionTypes(productTreeMin).join(",") === "BrandHero,RichText,RichText,FeatureGrid,FAQ,BrandCTA,Footer",
  sectionTypes(productTreeMin).join(","),
);
assert(
  "problem/solution als markdown-koppen",
  String(sectionsOf(productTreeMin, "RichText")[0].props.content).startsWith(`## ${productFixtureMinimal.problem.heading}`)
    && String(sectionsOf(productTreeMin, "RichText")[1].props.content).startsWith(`## ${productFixtureMinimal.solution.heading}`),
);
assert("FAQ-heading 'Veelgestelde vragen'", sectionsOf(productTreeMin, "FAQ")[0].props.heading === "Veelgestelde vragen");
assert(
  "finalCta label = hero.primaryCta (single-CTA) + body in riskReducer",
  sectionsOf(productTreeMin, "BrandCTA")[0].props.label === productFixtureMinimal.hero.primaryCta
    && sectionsOf(productTreeMin, "BrandCTA")[0].props.riskReducer === productFixtureMinimal.finalCta.body,
);

const productTreeFull = buildProductPageTemplateFromStructured(productFixtureFull, null);
const fullTypes = sectionTypes(productTreeFull);
assert("full: alle features hebben beeld → FeatureSplit", fullTypes.includes("FeatureSplit") && !fullTypes.slice(0, 4).includes("FeatureGrid"));
assert("full: useCases als FeatureGrid aanwezig", fullTypes.includes("FeatureGrid"));
const fullRichTexts = sectionsOf(productTreeFull, "RichText").map((s) => String(s.props.content));
// W2: specs renderen nu als native SpecTable (zie page-types-w2-w3.ts), niet
// meer als markdown-bullet-RichText.
assert("full: specs → native SpecTable met de spec-rijen", (() => {
  const tables = sectionsOf(productTreeFull, "SpecTable");
  if (tables.length !== 1) return false;
  const items = tables[0].props.items as Array<{ label: string; value: string }>;
  return items.some((r) => r.label === "Materiaal" && r.value === "Gerecycled aluminium");
})());
assert("full: processSteps als genummerde lijst", fullRichTexts.some((c) => c.startsWith("## Zo werkt het") && c.includes("1. **Kennismaking**")));
assert("full: pricing-prose-sectie", fullRichTexts.some((c) => c.startsWith("## Transparante prijzen")));

const productCtx = {
  brand: { brandName: "Testmerk" },
  brandImages: [
    { url: "https://example.com/brand-1.jpg" },
    { url: "https://example.com/brand-2.jpg" },
  ],
  personas: [],
} as unknown as CanvasContextStack;
const productTreeImg = buildProductPageTemplateFromStructured(productFixtureMinimal, productCtx);
const imgHero = sectionsOf(productTreeImg, "BrandHero")[0];
assert("brand-image fill: hero krijgt eerste brandImage", imgHero.props.heroVisualUrl === "https://example.com/brand-1.jpg");
const imgFeatures = (sectionsOf(productTreeImg, "FeatureGrid")[0].props.features as Array<{ imageUrl: string | null }>);
assert("brand-image fill: eerste feature krijgt tweede brandImage", imgFeatures[0].imageUrl === "https://example.com/brand-2.jpg");
assert("brand-image fill: input-fixture niet gemuteerd", !productFixtureMinimal.hero.heroVisualUrl && !productFixtureMinimal.features[0].imageUrl);
assert("footer companyName uit ctx", sectionsOf(productTreeImg, "Footer")[0].props.companyName === "Testmerk");

// ─── E. Microsite-builder ──────────────────────────────

group("E. buildMicrositeTemplateFromStructured");
const microTree = buildMicrositeTemplateFromStructured(micrositeFixture, null);
const microTypes = sectionTypes(microTree);
// W4: BrandNav → sticky AnchorNav; HighlightCards na de hero (≥2 hoofdstukken);
// hoofdstukken renderen als StoryChapter i.p.v. markdown-RichText.
assert("start met AnchorNav (sticky ankernavigatie)", microTypes[0] === "AnchorNav");
assert(
  "sectie-volgorde nav → hero → highlights → story (chapter+stat+quote) → impact → join → footer",
  microTypes.join(",") === "AnchorNav,BrandHero,HighlightCards,StoryChapter,StatsBlock,Testimonial,StoryChapter,BrandCTA,Footer",
  microTypes.join(","),
);
const nav = sectionsOf(microTree, "AnchorNav")[0];
const navLinks = nav.props.links as Array<{ label: string; href: string }>;
assert(
  "nav-links = hoofdstukken + join met #slug-hrefs",
  navLinks.length === 3
    && navLinks[0].href === "#verhaal" && navLinks[1].href === "#impact" && navLinks[2].href === "#meedoen",
  JSON.stringify(navLinks),
);
assert("nav genummerd (story-arc expliciet)", nav.props.numbered === true);
assert("nav-CTA scrollt naar join-anker", nav.props.ctaHref === "#meedoen");
assert("hero-CTA scrollt naar join-anker", sectionsOf(microTree, "BrandHero")[0].props.ctaHref === "#meedoen");
const microChapters = sectionsOf(microTree, "StoryChapter");
assert("één StoryChapter per hoofdstuk (2 hoofdstukken)", microChapters.length === 2);
assert(
  "hoofdstuk-anker matcht nav-link",
  microChapters[0].props.anchorId === "verhaal" && microChapters[1].props.anchorId === "impact",
);
const storyBlocks = microChapters[0].props.blocks as Array<{ heading: string; body: string }>;
assert(
  "StoryChapter: heading + intro + block-heading + block-body",
  microChapters[0].props.heading === "Ons verhaal"
    && microChapters[0].props.intro === micrositeFixture.story.intro
    && storyBlocks[1].heading === "De kanteling"
    && storyBlocks[0].body === chapterBlocks[0].body,
);
const stats = sectionsOf(microTree, "StatsBlock")[0];
assert(
  "stat-callout → StatsBlock (value + context als label)",
  (stats.props.items as Array<{ value: string; label: string }>)[0].value === "410+"
    && (stats.props.items as Array<{ value: string; label: string }>)[0].label === "huishoudens delen al",
);
const microQuote = sectionsOf(microTree, "Testimonial")[0];
assert("quote → Testimonial met attribution", microQuote.props.author === "Deelnemer uit Utrecht");
const joinCta = sectionsOf(microTree, "BrandCTA")[0];
assert("join: anker + heading + label", joinCta.props.anchorId === "meedoen" && joinCta.props.heading === micrositeFixture.join.heading && joinCta.props.label === micrositeFixture.join.primaryCta);
assert(
  "join: body + deadline samen in riskReducer",
  joinCta.props.riskReducer === "Meld je huishouden aan en deel mee. — Aanmelden kan tot 1 juli",
  String(joinCta.props.riskReducer),
);

const microDup = buildMicrositeTemplateFromStructured(
  {
    ...micrositeFixture,
    impact: { ...micrositeFixture.impact!, navLabel: "Verhaal" },
  },
  null,
);
const dupAnchors = sectionsOf(microDup, "StoryChapter").map((s) => s.props.anchorId);
assert("slug-dedup bij dubbele navLabels", dupAnchors[0] === "verhaal" && dupAnchors[1] === "verhaal-2", JSON.stringify(dupAnchors));
assert("slugifyAnchor: diacritics + fallback", slugifyAnchor("Doe méé!", "x") === "doe-mee" && slugifyAnchor("???", "sectie-1") === "sectie-1");

// ─── F. Dispatch + legacy seed-template ────────────────

group("F. variantToPuckDataFromStructured dispatch + W0-B");
assert("LP-variant → LP-tree (BrandHero + trust-FeatureGrid)", sectionTypes(variantToPuckDataFromStructured(lpFixture, null)).slice(0, 2).join(",") === "BrandHero,FeatureGrid");
assert("faq-variant → faq-tree (W3/W4: AnchorNav[0] bij 2 categorieën, FAQ-blokken aanwezig)", (() => {
  const t = sectionTypes(variantToPuckDataFromStructured(faqFixture, null));
  return t[0] === "AnchorNav" && t.includes("FAQ");
})());
assert("product-variant → product-tree", sectionTypes(variantToPuckDataFromStructured(productFixtureMinimal, null)).join(",") === sectionTypes(productTreeMin).join(","));
assert("microsite-variant → microsite-tree (AnchorNav eerst)", sectionTypes(variantToPuckDataFromStructured(micrositeFixture, null))[0] === "AnchorNav");

const legacyFilled: FilledFields = {
  headline: "Test",
  sub: "Subline",
  ctaLabel: "Start",
  ctaHref: "#",
  featureItems: [{ title: "A", description: "B" }],
  faqItems: [],
  testimonialQuote: "Quote",
  testimonialAuthor: "",
  pricingTiers: [],
  longText: "Een langere tekst voor de microsite.",
};
const legacyMicro = buildMicrositeTemplate(legacyFilled, null);
assert(
  "W0-B: legacy microsite-seed heeft precies 1 RichText (geen dubbele longText)",
  sectionsOf(legacyMicro as { content: unknown }, "RichText").length === 1,
);

// ─── G. Flatten ────────────────────────────────────────

group("G. flattenPageVariantToText");
const faqFlat = flattenPageVariantToText(faqFixture);
assert(
  "faq-flatten bevat hero + vraag + escape-hatch",
  faqFlat.includes(faqFixture.hero.headline) && faqFlat.includes("Vraag 4?") && faqFlat.includes(faqFixture.contactEscape.heading),
);
const productFlat = flattenPageVariantToText(productFixtureFull);
assert(
  "product-flatten bevat solution + finalCta",
  productFlat.includes(productFixtureFull.solution.heading) && productFlat.includes(productFixtureFull.finalCta.heading),
);
const microFlat = flattenPageVariantToText(micrositeFixture);
assert(
  "microsite-flatten bevat story + join",
  microFlat.includes(micrositeFixture.story.heading) && microFlat.includes(micrositeFixture.join.heading),
);
assert("LP-flatten valt door naar flattenVariantToText (byte-gelijk)", flattenPageVariantToText(lpFixture) === flattenVariantToText(lpFixture));

// ─── Samenvatting ──────────────────────────────────────

console.log(`\n${"=".repeat(50)}`);
console.log(`TOTAAL: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
