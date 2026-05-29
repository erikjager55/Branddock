/**
 * Smoke-test voor Phase 6.5 — markdown-blob fallback in variantToPuckData.
 *
 * SEO-pipeline output is typisch één variant-group ("BODY") met een complete
 * markdown-article van 500+ woorden. De keyed-lookup van extractFilledFields
 * matched daar niets — voor Phase 6.5 (2026-05-24) hebben we een markdown-
 * blob fallback toegevoegd die hed/sub/features/faq uit de article-tekst
 * parst.
 *
 * Verifies:
 *  - Markdown H1 → headline (skipt SEO-pipeline placeholder headers zoals "BODY")
 *  - First non-header paragraph → sub (max 2 sentences)
 *  - H2/H3 sections ending in "?" → faqItems
 *  - H2/H3 sections not ending in "?" → featureItems
 *  - Blockquote (>) → testimonialQuote
 *  - longText fallback bevat de hele article (truncated)
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase6.5-markdown-blob.ts
 */

import { extractFilledFields } from '../../src/features/campaigns/components/canvas/medium/variant-to-puck-data';
import type { PreviewContent } from '../../src/features/campaigns/types/canvas.types';
import type { CanvasContextStack } from '../../src/lib/ai/canvas-context';
import { DEFAULT_BRAND_TOKENS, type BrandTokens } from '../../src/lib/landing-pages/brand-tokens';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`);
    fail++;
  }
}

function group(name: string): void {
  console.log(`\n${name}`);
}

const TOKENS: BrandTokens = {
  ...DEFAULT_BRAND_TOKENS,
  headingFont: 'sans-serif', bodyFont: 'sans-serif',
};

const EMPTY_CTX: CanvasContextStack = {
  brand: { brandName: 'TestBrand' },
  concept: null, journeyPhase: null, medium: null,
  deliverableTypeId: 'landing-page',
  personas: [], brief: null, products: [],
  brandTokens: TOKENS,
};

// Realistic SEO-pipeline output for a landing-page deliverable
// (anonymised version of what user saw in Stap 2 vandaag).
const SEO_PIPELINE_BLOB = `# BODY

# Vloerluik op maat: handgemaakt precisiewerk uit eigen werkplaats

Een vloerluik op maat dat opgaat in uw vloer — onzichtbaar tot u het opent.
Onze houten luiken worden tot op de millimeter nauwkeurig ingemeten en in
eigen werkplaats vervaardigd.

### Precisiewerk tot op de millimeter

Wij meten uw vloerluik op maat zodat het exact past in de bestaande vloer.
Onze CNC-machines garanderen een afwijking van minder dan 0,5 mm. Het frame
en het luik worden volledig op uw vloer afgestemd.

### Naadloos in elke vloerafwerking

Of u nu houten parket, gietvloer of tegels heeft — onze vloerluiken zijn
onzichtbaar te integreren. We monteren een afwerkrand mee zodat de
vloerafwerking exact aansluit.

### Voor woningeigenaren, architecten en ontwikkelaars

Wij werken voor particulieren én voor architecten en ontwikkelaars die
op zoek zijn naar high-end design-luiken voor nieuwbouwprojecten.

## Hoe werkt het traject?

Het traject start met een inmeting bij u op locatie. Daarna ontvangt u
een offerte en bij akkoord gaan we in productie.

## Wat kost een vloerluik op maat?

De prijs hangt af van afmeting, afwerking en bediening. Een elektrisch
vloerluik is duurder dan een handbediende variant. Vraag een offerte aan
voor uw specifieke situatie.

## Kan ik een vloerluik in een bestaande woning plaatsen?

Ja, mits er voldoende dragend hout en ruimte onder de vloer beschikbaar
is. Wij komen ter plaatse om de mogelijkheden te beoordelen.

> "Het vloerluik dat Linfi voor ons maakte is precisiewerk van de
> bovenste plank — je ziet niet eens dat het er is tot je het opent."

## Contactgegevens en werkgebied

Linfi werkt door heel Nederland vanuit onze vestiging in Veenendaal. U
spreekt direct met de vakman die uw luik gaat maken.`;

function blobVariant(content: string): PreviewContent {
  return {
    body: { content, type: 'text' },
  };
}

function testHeadlineExtraction(): void {
  group('1. Headline extraction — skipt placeholder + pakt real title');

  const filled = extractFilledFields(blobVariant(SEO_PIPELINE_BLOB), EMPTY_CTX);
  assert(
    `headline = "Vloerluik op maat: handgemaakt precisiewerk uit eigen werkplaats" (got "${filled.headline}")`,
    filled.headline === 'Vloerluik op maat: handgemaakt precisiewerk uit eigen werkplaats',
  );
  assert(
    'headline skipt placeholder "BODY"',
    !filled.headline.includes('BODY'),
  );
}

function testSubExtraction(): void {
  group('2. Sub extraction — first paragraph na headline');

  const filled = extractFilledFields(blobVariant(SEO_PIPELINE_BLOB), EMPTY_CTX);
  assert(
    `sub starts with "Een vloerluik op maat" (got "${filled.sub.slice(0, 40)}...")`,
    filled.sub.startsWith('Een vloerluik op maat'),
  );
  assert(`sub ≤ 200 chars (got ${filled.sub.length})`, filled.sub.length <= 200);
}

function testFeatureItems(): void {
  group('3. FeatureItems — H3 sections zonder "?" worden features');

  const filled = extractFilledFields(blobVariant(SEO_PIPELINE_BLOB), EMPTY_CTX);
  const titles = filled.featureItems.map((f) => f.title);

  assert(`featureItems > 0 (got ${filled.featureItems.length})`, filled.featureItems.length > 0);
  assert(`featureItems ≤ 6 (got ${filled.featureItems.length})`, filled.featureItems.length <= 6);
  assert(
    'Features bevatten "Precisiewerk tot op de millimeter"',
    titles.includes('Precisiewerk tot op de millimeter'),
  );
  assert(
    'Features bevatten "Naadloos in elke vloerafwerking"',
    titles.includes('Naadloos in elke vloerafwerking'),
  );
  assert(
    'Features bevatten GEEN question-headers',
    !titles.some((t) => t.endsWith('?')),
  );

  const first = filled.featureItems[0];
  assert(
    'eerste feature heeft description gevuld',
    typeof first?.description === 'string' && first.description.length > 0,
  );
}

function testFaqItems(): void {
  group('4. FaqItems — H2 sections eindigend op "?" worden FAQ');

  const filled = extractFilledFields(blobVariant(SEO_PIPELINE_BLOB), EMPTY_CTX);
  const questions = filled.faqItems.map((f) => f.question);

  assert(`faqItems > 0 (got ${filled.faqItems.length})`, filled.faqItems.length > 0);
  assert(
    'FAQ bevat "Hoe werkt het traject?"',
    questions.includes('Hoe werkt het traject?'),
  );
  assert(
    'FAQ bevat "Wat kost een vloerluik op maat?"',
    questions.includes('Wat kost een vloerluik op maat?'),
  );
  assert(
    'FAQ items eindigen ALLE op "?"',
    questions.every((q) => q.endsWith('?')),
  );

  const first = filled.faqItems[0];
  assert(
    'eerste FAQ heeft answer gevuld',
    typeof first?.answer === 'string' && first.answer.length > 0 && first.answer !== 'TBD',
  );
}

function testTestimonialQuote(): void {
  group('5. TestimonialQuote — blockquote extractie');

  const filled = extractFilledFields(blobVariant(SEO_PIPELINE_BLOB), EMPTY_CTX);
  assert(
    'testimonialQuote bevat "precisiewerk"',
    filled.testimonialQuote.toLowerCase().includes('precisiewerk'),
  );
  assert(
    'testimonialQuote bevat geen ">" prefix',
    !filled.testimonialQuote.startsWith('>'),
  );
}

function testLongText(): void {
  group('6. LongText fallback — bevat blob (truncated)');

  const filled = extractFilledFields(blobVariant(SEO_PIPELINE_BLOB), EMPTY_CTX);
  assert(
    'longText bevat article-content',
    filled.longText.includes('Vloerluik op maat'),
  );
  assert(
    `longText ≤ 1500 chars (got ${filled.longText.length})`,
    filled.longText.length <= 1500,
  );
}

function testKeyedPathStillWorks(): void {
  group('7. Keyed-lookup blijft werken (regression check)');

  const keyedContent: PreviewContent = {
    headline: { content: 'Direct keyed headline', type: 'text' },
    sub: { content: 'Direct keyed sub', type: 'text' },
    cta: { content: 'Click me', type: 'text' },
  };
  const filled = extractFilledFields(keyedContent, EMPTY_CTX);
  assert('keyed headline wint', filled.headline === 'Direct keyed headline');
  assert('keyed sub wint', filled.sub === 'Direct keyed sub');
  assert('keyed cta wint', filled.ctaLabel === 'Click me');
}

function testFallbackToConcept(): void {
  group('8. Fallback naar concept-context wanneer geen blob + geen keys');

  const ctxWithConcept: CanvasContextStack = {
    ...EMPTY_CTX,
    concept: {
      campaignTheme: 'Lente-launch',
      positioningStatement: 'Voor de marketingteams die snel willen.',
      strategicApproach: null, keyMessages: [], targetAudienceInsights: null,
      humanInsight: null, creativePlatform: null,
    },
  };
  const filled = extractFilledFields({}, ctxWithConcept);
  assert('fallback headline = campaignTheme', filled.headline === 'Lente-launch');
  assert('fallback sub = positioningStatement',
    filled.sub === 'Voor de marketingteams die snel willen.');
}

async function main(): Promise<void> {
  console.log('Phase 6.5 smoke-test — markdown-blob fallback in extractFilledFields');
  testHeadlineExtraction();
  testSubExtraction();
  testFeatureItems();
  testFaqItems();
  testTestimonialQuote();
  testLongText();
  testKeyedPathStillWorks();
  testFallbackToConcept();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('SMOKE crashed', err);
  process.exit(2);
});
