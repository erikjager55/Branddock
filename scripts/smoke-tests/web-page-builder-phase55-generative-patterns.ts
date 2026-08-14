/**
 * Phase 55 — C3 generatieve pattern-keuze (ADR 2026-08-12-generative-pattern-choice).
 *
 * Bewaakt:
 *  1. Schema-additiviteit + don't-break-parse: `layoutPatterns` parset bij
 *     geldig/ongeldig/afwezig — een hallucinatie (verkeerd type, onzin-object)
 *     degradeert per key of als geheel naar undefined, nooit een parse-fail.
 *     Voor LP én de per-type schemas (faq/product/microsite).
 *  2. sanitizeVariantLayoutPatterns: onbekende key → 'default';
 *     archetype-restrictie (RULER/null krijgt geen bento) → 'default';
 *     minItems (stats-cards bij 1 stat) → 'default'; faq-page `categories`
 *     valideert tegen de kléinste categorie; GEO/afwezig veld = no-op.
 *  3. Mappers: gevalideerde keys landen als `patternKey`-prop op de juiste
 *     component-instanties; zonder layoutPatterns verschijnt de prop nergens
 *     (byte-compat met het pre-C3-gedrag); trust-strip-FeatureGrid blijft
 *     bewust key-loos.
 *  4. Prompt: het LAYOUT-PATTERNS-blok bevat de archetype-toegestane keys +
 *     het variatie-directief; RULER/null-archetype zien restricted patterns
 *     niet; long-form GEO krijgt géén blok.
 *
 * No DB, no AI — pure schema/sanitize/mapper/prompt checks.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase55-generative-patterns.ts
 */

// Dynamic import ná env-load (patroon source-image-matcher.ts): variant-generator
// trekt transitief prisma binnen, die DATABASE_URL al bij module-load eist. De
// smoke raakt de DB nooit — zonder .env (CI-sandbox) volstaat een dummy zodat
// de import-keten niet faalt; op de dev-machine wint de echte .env.local.
import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"] });
process.env.DATABASE_URL ??= "postgresql://smoke:smoke@localhost:5432/smoke";

import {
  landingPageVariantSchema,
  type LandingPageVariantContent,
} from "../../src/lib/landing-pages/variant-schema";
import {
  faqPageVariantSchema,
  productPageVariantSchema,
  micrositeVariantSchema,
  type FaqPageVariantContent,
  type ProductPageVariantContent,
  type MicrositeVariantContent,
} from "../../src/lib/landing-pages/page-type-schemas";
import {
  buildLayoutPatternPromptBlock,
  patternProp,
  patternSlotsFor,
  sanitizeVariantLayoutPatterns,
  variantLayoutPatterns,
} from "../../src/lib/landing-pages/pattern-choice";
import { buildLandingPageTemplateFromStructured } from "../../src/features/campaigns/components/canvas/medium/puck-templates/landing-page-from-structured";
import { buildProductPageTemplateFromStructured } from "../../src/features/campaigns/components/canvas/medium/puck-templates/product-page-from-structured";
import { buildFaqPageTemplateFromStructured } from "../../src/features/campaigns/components/canvas/medium/puck-templates/faq-page-from-structured";
import { buildMicrositeTemplateFromStructured } from "../../src/features/campaigns/components/canvas/medium/puck-templates/microsite-from-structured";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}

type Instance = { type: string; props: Record<string, unknown> };
const ofType = (tree: { content: unknown }, type: string): Instance[] =>
  (tree.content as Instance[]).filter((s) => s.type === type);
const hasKey = (inst: Instance | undefined): boolean =>
  !!inst && "patternKey" in inst.props;

// ─── Fixtures ────────────────────────────────────────────────

const lpBase = {
  hero: {
    headline: "Bespaar 5 uur per week",
    subhead: "Voor productteams die snel willen schakelen.",
    primaryCta: "Start mijn proefperiode",
  },
  trust: {
    type: "logos",
    items: [{ label: "Acme" }, { label: "Globex" }, { label: "Initech" }],
  },
  features: {
    sectionHeading: "Wat je krijgt",
    items: [
      { icon: "zap", heading: "Snelle setup", body: "Binnen een dag live." },
      { icon: "shield", heading: "Veilig", body: "ISO-gecertificeerd." },
      { icon: "star", heading: "Bewezen", body: "Door 200 teams gebruikt." },
    ],
  },
  socialProof: {
    testimonials: [
      { quote: "Dit scheelt ons uren.", authorName: "Sam", authorRole: "COO", authorCompany: "Acme" },
    ],
    impactStats: [
      { value: "30 uur", label: "Per maand bespaard" },
      { value: "97%", label: "Retentie" },
    ],
  },
  faq: {
    items: [
      { question: "Wat kost het?", answer: "Vanaf 49 euro per maand." },
      { question: "Hoe lang duurt implementatie?", answer: "Eén dag." },
      { question: "Kan ik opzeggen?", answer: "Maandelijks opzegbaar." },
      { question: "Is er support?", answer: "Ja, via chat en mail." },
      { question: "Werkt het met onze tools?", answer: "Ja, via integraties." },
    ],
  },
  finalCta: {
    heading: "Klaar om te beginnen?",
    riskReducer: "Vrijblijvend en binnen 24 uur reactie",
    primaryCta: "Start mijn proefperiode",
  },
};

function lpWith(layoutPatterns: unknown): unknown {
  return { ...lpBase, layoutPatterns };
}

const faqPageBase: FaqPageVariantContent = {
  hero: { headline: "We helpen je graag", subline: "Alles over bestellen, betalen en retourneren." },
  popularQuestions: [
    { question: "Hoe snel wordt er geleverd?", answer: "Binnen 2 werkdagen." },
    { question: "Retourneren: hoe werkt het?", answer: "Binnen 30 dagen gratis." },
    { question: "Welke betaalmethodes zijn er?", answer: "iDEAL, creditcard en factuur." },
  ],
  categories: [
    {
      label: "Bestellen & betalen",
      items: [
        { question: "Kan ik op factuur betalen?", answer: "Ja, voor zakelijke klanten." },
        { question: "Krijg ik een orderbevestiging?", answer: "Ja, direct per mail." },
        { question: "Kan ik mijn bestelling wijzigen?", answer: "Tot verzending, via support." },
      ],
    },
  ],
  contactEscape: { heading: "Staat je vraag er niet bij?", body: "We reageren binnen een werkdag.", ctaLabel: "Stel je vraag" },
  closingCta: { heading: "Verder geholpen worden?", ctaLabel: "Neem contact op" },
};

const productBase: ProductPageVariantContent = {
  hero: {
    headline: "Genereer sneller inkomsten",
    subline: "Facturatie die zichzelf regelt, zonder migratieproject.",
    primaryCta: "Plan een demo",
  },
  problem: { heading: "Handmatig factureren rekt", body: "Elke maand dezelfde handmatige rondes." },
  solution: { heading: "Eén geautomatiseerde flow", body: "Van offerte tot incasso in één systeem." },
  features: [
    { heading: "Automatische incasso", body: "Betalingen innen zonder omkijken." },
    { heading: "Slimme herinneringen", body: "Debiteurenbeheer op de automatische piloot." },
    { heading: "Realtime rapportage", body: "Cashflow-inzicht per dag." },
  ],
  faq: [
    { question: "Hoe lang duurt de implementatie?", answer: "Gemiddeld een week." },
    { question: "Koppelt het met onze boekhouding?", answer: "Ja, met de gangbare pakketten." },
    { question: "Wat kost het?", answer: "Prijs op aanvraag via de demo." },
  ],
  finalCta: { heading: "Klaar voor snellere inkomsten?", body: "Vrijblijvende demo van 30 minuten.", primaryCta: "Plan een demo" },
};

const micrositeBase: MicrositeVariantContent = {
  heroManifest: {
    navLabel: "Start",
    headline: "Toegang is beter dan bezit",
    subline: "Waarom delen de nieuwe standaard wordt.",
    primaryCta: "Doe mee met de beweging",
  },
  story: {
    navLabel: "Verhaal",
    heading: "Hoe het begon",
    blocks: [
      { body: "Het begon met één gedeelde werkplaats in een buurt die zijn gereedschap samen ging beheren en gebruiken." },
      { body: "Binnen een jaar volgden er twaalf buurten met hetzelfde model, elk met een eigen beheerder en agenda." },
    ],
    quote: { text: "Ik gebruik nu betere machines dan ik ooit zelf zou kopen.", attribution: "Deelnemer van het eerste uur" },
  },
  join: {
    navLabel: "Doe mee",
    heading: "Sluit je aan",
    body: "Meld je buurt aan en start binnen een maand.",
    primaryCta: "Meld je buurt aan",
  },
};

// ─── 1. Schema — accepteert / degradeert / afwezig ───────────

console.log("\n1. LP-schema: layoutPatterns additief + don't-break-parse");
{
  const absent = landingPageVariantSchema.safeParse(lpBase);
  assert("zonder layoutPatterns parset (backward-compat)", absent.success);
  assert(
    "zonder layoutPatterns → veld undefined",
    absent.success && absent.data.layoutPatterns === undefined,
  );

  const valid = landingPageVariantSchema.safeParse(
    lpWith({ features: "bento", faq: "two-column", finalCta: "split" }),
  );
  assert("geldige keys parsen", valid.success);
  assert(
    "geldige keys blijven staan",
    valid.success &&
      valid.data.layoutPatterns?.features === "bento" &&
      valid.data.layoutPatterns?.faq === "two-column" &&
      valid.data.layoutPatterns?.finalCta === "split",
  );

  const wrongType = landingPageVariantSchema.safeParse(
    lpWith({ features: 42, faq: "two-column" }),
  );
  assert("niet-string key degradeert per veld (parse slaagt)", wrongType.success);
  assert(
    "features → undefined, faq blijft",
    wrongType.success &&
      wrongType.data.layoutPatterns?.features === undefined &&
      wrongType.data.layoutPatterns?.faq === "two-column",
  );

  const nonObject = landingPageVariantSchema.safeParse(lpWith("bento"));
  assert("layoutPatterns als string degradeert naar undefined", nonObject.success && nonObject.data.layoutPatterns === undefined);

  const asArray = landingPageVariantSchema.safeParse(lpWith(["bento"]));
  assert("layoutPatterns als array degradeert naar undefined", asArray.success && asArray.data.layoutPatterns === undefined);

  const extraField = landingPageVariantSchema.safeParse(
    lpWith({ features: "bento", verzonnenSectie: "mega" }),
  );
  assert(
    "onbekend veld wordt gestript (Zod object)",
    extraField.success &&
      extraField.data.layoutPatterns !== undefined &&
      !("verzonnenSectie" in (extraField.data.layoutPatterns as Record<string, unknown>)),
  );

  const tooLong = landingPageVariantSchema.safeParse(
    lpWith({ features: "x".repeat(60) }),
  );
  assert("key >40 tekens degradeert naar undefined", tooLong.success && tooLong.data.layoutPatterns?.features === undefined);
}

console.log("\n2. Per-type schemas: layoutPatterns additief");
{
  const faqAbsent = faqPageVariantSchema.safeParse(faqPageBase);
  assert("faq-page zonder layoutPatterns parset", faqAbsent.success);
  const faqValid = faqPageVariantSchema.safeParse({
    ...faqPageBase,
    layoutPatterns: { popularQuestions: "two-column", categories: "default", closingCta: "card" },
  });
  assert(
    "faq-page keys blijven staan",
    faqValid.success && faqValid.data.layoutPatterns?.popularQuestions === "two-column" && faqValid.data.layoutPatterns?.closingCta === "card",
  );
  const faqGarbage = faqPageVariantSchema.safeParse({ ...faqPageBase, layoutPatterns: 7 });
  assert("faq-page onzin-layoutPatterns degradeert", faqGarbage.success && faqGarbage.data.layoutPatterns === undefined);

  const prodValid = productPageVariantSchema.safeParse({
    ...productBase,
    layoutPatterns: { features: "alternating", faq: "two-column", finalCta: "split" },
  });
  assert(
    "product-page keys blijven staan",
    prodValid.success && prodValid.data.layoutPatterns?.features === "alternating",
  );

  const microValid = micrositeVariantSchema.safeParse({
    ...micrositeBase,
    layoutPatterns: { quote: "spotlight", join: "card" },
  });
  assert(
    "microsite keys blijven staan",
    microValid.success && microValid.data.layoutPatterns?.quote === "spotlight" && microValid.data.layoutPatterns?.join === "card",
  );
}

// ─── 3. Server-side validatie (sanitize) ─────────────────────

console.log("\n3. sanitizeVariantLayoutPatterns — archetype + minItems + onbekend");
{
  const parse = (lp: unknown): LandingPageVariantContent => {
    const r = landingPageVariantSchema.safeParse(lp);
    if (!r.success) throw new Error("fixture hoort te parsen");
    return r.data;
  };

  const jester = sanitizeVariantLayoutPatterns(
    parse(lpWith({ features: "bento", testimonial: "spotlight", stats: "cards", faq: "two-column", finalCta: "split" })),
    "landing-page",
    "JESTER",
  );
  const jesterKeys = variantLayoutPatterns(jester);
  assert("JESTER: bento toegestaan (3 features)", jesterKeys.features === "bento");
  assert("JESTER: stats-cards toegestaan (2 stats)", jesterKeys.stats === "cards");
  assert("JESTER: overige keys blijven", jesterKeys.testimonial === "spotlight" && jesterKeys.faq === "two-column" && jesterKeys.finalCta === "split");

  const ruler = sanitizeVariantLayoutPatterns(
    parse(lpWith({ features: "bento", stats: "cards", finalCta: "card" })),
    "landing-page",
    "RULER",
  );
  const rulerKeys = variantLayoutPatterns(ruler);
  assert("RULER: bento → default (archetype-restrictie)", rulerKeys.features === "default");
  assert("RULER: stats-cards → default (forceFlatCards)", rulerKeys.stats === "default");
  assert("RULER: ongerestricteerde key blijft (BrandCTA card)", rulerKeys.finalCta === "card");

  const nullArch = sanitizeVariantLayoutPatterns(
    parse(lpWith({ features: "bento", features2: "x" })),
    "landing-page",
    null,
  );
  assert("null-archetype: bento → default (restricties vragen evidence)", variantLayoutPatterns(nullArch).features === "default");

  const unknownKey = sanitizeVariantLayoutPatterns(
    parse(lpWith({ features: "holo-deck" })),
    "landing-page",
    "JESTER",
  );
  assert("onbekende key → default", variantLayoutPatterns(unknownKey).features === "default");

  // minItems: 1 impactStat → cards (min 2) niet toegestaan
  const oneStat = {
    ...lpBase,
    socialProof: { ...lpBase.socialProof, impactStats: [{ value: "30 uur", label: "Bespaard" }] },
    layoutPatterns: { stats: "cards" },
  };
  const oneStatSan = sanitizeVariantLayoutPatterns(parse(oneStat), "landing-page", "SAGE");
  assert("minItems: cards bij 1 stat → default", variantLayoutPatterns(oneStatSan).stats === "default");

  // veld buiten de slot-lijst valt weg na sanitize
  const raw = parse(lpBase);
  const withStray = { ...raw, layoutPatterns: { features: "alternating", pricing: "cards" } } as unknown as LandingPageVariantContent;
  const strayKeys = variantLayoutPatterns(sanitizeVariantLayoutPatterns(withStray, "landing-page", "SAGE"));
  assert("veld buiten slots valt weg", !("pricing" in strayKeys) && strayKeys.features === "alternating");

  // geen layoutPatterns → zelfde referentie (no-op)
  const untouched = parse(lpBase);
  assert("zonder layoutPatterns: no-op (zelfde referentie)", sanitizeVariantLayoutPatterns(untouched, "landing-page", "JESTER") === untouched);

  // faq-page: categories valideert tegen de kleinste categorie
  const faqParsed = faqPageVariantSchema.safeParse({
    ...faqPageBase,
    layoutPatterns: { categories: "two-column" },
  });
  if (!faqParsed.success) throw new Error("faq fixture hoort te parsen");
  const faqSan = sanitizeVariantLayoutPatterns(faqParsed.data, "faq-page", "SAGE");
  assert("faq-page: two-column bij categorie van 3 items → default", variantLayoutPatterns(faqSan).categories === "default");

  const faqBig = faqPageVariantSchema.safeParse({
    ...faqPageBase,
    categories: [
      {
        label: "Bestellen & betalen",
        items: [
          { question: "Kan ik op factuur betalen?", answer: "Ja." },
          { question: "Krijg ik een bevestiging?", answer: "Ja." },
          { question: "Kan ik wijzigen?", answer: "Tot verzending." },
          { question: "Kan ik annuleren?", answer: "Tot verzending." },
        ],
      },
    ],
    layoutPatterns: { categories: "two-column" },
  });
  if (!faqBig.success) throw new Error("faq-big fixture hoort te parsen");
  assert(
    "faq-page: two-column bij 4 items blijft staan",
    variantLayoutPatterns(sanitizeVariantLayoutPatterns(faqBig.data, "faq-page", "SAGE")).categories === "two-column",
  );

  // GEO/long-form: geen slots → no-op, ook met een (onmogelijk) veld
  assert("long-form GEO heeft geen slots", patternSlotsFor("blog-post").length === 0);
  const geoLike = { ...raw, layoutPatterns: { features: "bento" } } as unknown as LandingPageVariantContent;
  assert("GEO-type: sanitize is no-op", sanitizeVariantLayoutPatterns(geoLike, "blog-post", "JESTER") === geoLike);

  // variantLayoutPatterns leest veilig
  assert("variantLayoutPatterns zonder veld → {}", Object.keys(variantLayoutPatterns(untouched)).length === 0);
}

// ─── 4. Mappers — patternKey doorzetten / weglaten ───────────

console.log("\n4. LP-mapper: gevalideerde keys → patternKey-props");
{
  const parsed = landingPageVariantSchema.safeParse(
    lpWith({ features: "bento", testimonial: "spotlight", stats: "cards", faq: "two-column", finalCta: "split" }),
  );
  if (!parsed.success) throw new Error("fixture hoort te parsen");
  const tree = buildLandingPageTemplateFromStructured(parsed.data, null);
  const grids = ofType(tree, "FeatureGrid");
  assert("2 FeatureGrids (trust-strip + features)", grids.length === 2, String(grids.length));
  assert("trust-strip-grid blijft key-loos", !hasKey(grids[0]));
  assert("features-grid krijgt patternKey bento", grids[1]?.props.patternKey === "bento");
  assert("Testimonial krijgt spotlight", ofType(tree, "Testimonial")[0]?.props.patternKey === "spotlight");
  assert("StatsBlock krijgt cards", ofType(tree, "StatsBlock")[0]?.props.patternKey === "cards");
  assert("FAQ krijgt two-column", ofType(tree, "FAQ")[0]?.props.patternKey === "two-column");
  assert("BrandCTA krijgt split", ofType(tree, "BrandCTA")[0]?.props.patternKey === "split");

  // Zonder layoutPatterns: patternKey verschijnt nergens (byte-compat C1)
  const plainParsed = landingPageVariantSchema.safeParse(lpBase);
  if (!plainParsed.success) throw new Error("fixture hoort te parsen");
  const plainTree = buildLandingPageTemplateFromStructured(plainParsed.data, null);
  const anyKey = (plainTree.content as Instance[]).some((s) => "patternKey" in s.props);
  assert("zonder layoutPatterns: geen enkele patternKey-prop", !anyKey);

  // patternProp-vangnet: onbekende key normaliseert naar default
  assert("patternProp: onbekende key → default", patternProp("FeatureGrid", "holo-deck").patternKey === "default");
  assert("patternProp: lege/afwezige key → leeg object", Object.keys(patternProp("FeatureGrid", undefined)).length === 0 && Object.keys(patternProp("FeatureGrid", "")).length === 0);
}

console.log("\n5. Product/FAQ/microsite-mappers: patternKey doorzetten / weglaten");
{
  const prod = productPageVariantSchema.safeParse({
    ...productBase,
    layoutPatterns: { features: "alternating", faq: "two-column", finalCta: "card" },
  });
  if (!prod.success) throw new Error("product fixture hoort te parsen");
  const prodTree = buildProductPageTemplateFromStructured(prod.data, null);
  assert("product: features-grid krijgt alternating", ofType(prodTree, "FeatureGrid")[0]?.props.patternKey === "alternating");
  assert("product: FAQ krijgt two-column", ofType(prodTree, "FAQ")[0]?.props.patternKey === "two-column");
  assert("product: BrandCTA krijgt card", ofType(prodTree, "BrandCTA")[0]?.props.patternKey === "card");
  const prodPlain = buildProductPageTemplateFromStructured(productBase, null);
  assert("product zonder layoutPatterns: geen patternKey-props", !(prodPlain.content as Instance[]).some((s) => "patternKey" in s.props));

  const faqParsed = faqPageVariantSchema.safeParse({
    ...faqPageBase,
    layoutPatterns: { popularQuestions: "two-column", closingCta: "split" },
  });
  if (!faqParsed.success) throw new Error("faq fixture hoort te parsen");
  const faqTree = buildFaqPageTemplateFromStructured(faqParsed.data, null);
  const faqBlocks = ofType(faqTree, "FAQ");
  assert("faq-page: populaire-vragen-blok krijgt two-column", faqBlocks[0]?.props.patternKey === "two-column");
  assert("faq-page: categorie-blok zonder categories-key blijft key-loos", !hasKey(faqBlocks[1]));
  assert("faq-page: BrandCTA krijgt split", ofType(faqTree, "BrandCTA")[0]?.props.patternKey === "split");

  const micro = micrositeVariantSchema.safeParse({
    ...micrositeBase,
    layoutPatterns: { quote: "spotlight", join: "card" },
  });
  if (!micro.success) throw new Error("microsite fixture hoort te parsen");
  const microTree = buildMicrositeTemplateFromStructured(micro.data, null);
  assert("microsite: hoofdstuk-quote krijgt spotlight", ofType(microTree, "Testimonial")[0]?.props.patternKey === "spotlight");
  assert("microsite: join-CTA krijgt card", ofType(microTree, "BrandCTA")[0]?.props.patternKey === "card");
  const microPlain = buildMicrositeTemplateFromStructured(micrositeBase, null);
  assert("microsite zonder layoutPatterns: geen patternKey-props", !(microPlain.content as Instance[]).some((s) => "patternKey" in s.props));
}

// ─── 6. Prompt-blok ──────────────────────────────────────────

console.log("\n6. Prompt-blok: toegestane keys per archetype + variatie-directief");
{
  const jester = buildLayoutPatternPromptBlock("landing-page", "JESTER");
  assert("JESTER-blok noemt layoutPatterns-veld", jester.includes('"layoutPatterns"'));
  assert("JESTER-blok bevat bento + alternating + two-column + cards", ["'bento'", "'alternating'", "'two-column'", "'cards'"].every((k) => jester.includes(k)));
  assert("JESTER-blok bevat alle LP-slots", ['"features"', '"testimonial"', '"stats"', '"faq"', '"finalCta"'].every((f) => jester.includes(f)));
  assert("blok bevat variatie-directief", jester.includes("VARIEER") && jester.includes("LAYOUT"));
  assert("blok bevat minItems-voorwaarde", jester.includes("alleen bij 3+ items"));
  assert("blok waarschuwt tegen gokken buiten de lijst", jester.includes("gok niet buiten de lijst"));

  const ruler = buildLayoutPatternPromptBlock("landing-page", "RULER");
  assert("RULER-blok bevat geen bento", !ruler.includes("'bento'"));
  assert("RULER-blok slaat stats-slot over (alleen default over)", !ruler.includes('"stats"'));
  assert("RULER-blok houdt alternating", ruler.includes("'alternating'"));

  const nullArch = buildLayoutPatternPromptBlock("landing-page", null);
  assert("null-archetype: geen restricted patterns in het blok", !nullArch.includes("'bento'") && !nullArch.includes('"stats"'));
  assert("null-archetype: blok bestaat wél (ongerestricteerde keuzes)", nullArch.includes("'alternating'") && nullArch.includes("'spotlight'"));

  const faqBlock = buildLayoutPatternPromptBlock("faq-page", "SAGE");
  assert("faq-page-blok bevat popularQuestions + categories + closingCta", ['"popularQuestions"', '"categories"', '"closingCta"'].every((f) => faqBlock.includes(f)));
  const microBlock = buildLayoutPatternPromptBlock("microsite", "SAGE");
  assert("microsite-blok bevat quote + join", microBlock.includes('"quote"') && microBlock.includes('"join"'));
  assert("long-form GEO: leeg blok", buildLayoutPatternPromptBlock("blog-post", "SAGE") === "");

}

// ─── 7. Systeem-prompt-integratie (dynamic import, zie header) ──

async function main(): Promise<void> {
  console.log("\n7. buildLandingPageVariantPrompt: blok landt in het system-prompt");
  const { buildLandingPageVariantPrompt, LP_VARIANT_PROMPT_VERSION } = await import(
    "../../src/lib/landing-pages/variant-generator"
  );

  const lpPrompt = buildLandingPageVariantPrompt({
    brand: {},
    userPrompt: "Verkoop horeca-textiel-service.",
    archetype: "JESTER",
  });
  assert("LP-system-prompt bevat LAYOUT-PATTERNS-blok", lpPrompt.system.includes("# LAYOUT-PATTERNS") && lpPrompt.system.includes("'bento'"));
  assert("LP-system-prompt behoudt KRITISCHE REGELS erna", lpPrompt.system.includes("# KRITISCHE REGELS"));
  const faqPrompt = buildLandingPageVariantPrompt({
    contentType: "faq-page",
    brand: {},
    userPrompt: "FAQ voor webshop.",
    archetype: "SAGE",
  });
  assert("faq-system-prompt bevat LAYOUT-PATTERNS-blok", faqPrompt.system.includes("# LAYOUT-PATTERNS") && faqPrompt.system.includes('"popularQuestions"'));
  const prodPrompt = buildLandingPageVariantPrompt({
    contentType: "product-page",
    brand: {},
    userPrompt: "Productpagina voor facturatie-tool.",
    archetype: "HERO",
  });
  assert("product-system-prompt bevat LAYOUT-PATTERNS-blok", prodPrompt.system.includes("# LAYOUT-PATTERNS"));
  const microPrompt = buildLandingPageVariantPrompt({
    contentType: "microsite",
    brand: {},
    userPrompt: "Campagne-microsite deeleconomie.",
    archetype: "EXPLORER",
  });
  assert("microsite-system-prompt bevat LAYOUT-PATTERNS-blok", microPrompt.system.includes("# LAYOUT-PATTERNS"));
  const geoPrompt = buildLandingPageVariantPrompt({
    contentType: "blog-post",
    brand: {},
    userPrompt: "Long-form artikel over facturatie.",
    archetype: "SAGE",
  });
  assert("GEO-system-prompt bevat GEEN LAYOUT-PATTERNS-blok", !geoPrompt.system.includes("# LAYOUT-PATTERNS"));
  assert("prompt-versie minor gebumpt (2.2.x)", LP_VARIANT_PROMPT_VERSION.startsWith("2.2."));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

void main();
