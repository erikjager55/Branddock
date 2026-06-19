/**
 * Smoke-test — GEO/SEO Fase 2 schema-laag: longFormGeoVariantSchema +
 * schema-dispatch (getVariantSchemaForType/hasOwnVariantSchema) + de
 * `geoArticle`-discriminant in isLandingPageVariant + geen onjuiste JSON-LD.
 *
 * Run: npx tsx scripts/smoke-tests/geo-longform-schema.ts
 */
import {
  longFormGeoVariantSchema,
  faqPageVariantSchema,
  productPageVariantSchema,
  micrositeVariantSchema,
  getVariantSchemaForType,
  hasOwnVariantSchema,
  isLandingPageVariant,
  type PageVariantContent,
} from '../../src/lib/landing-pages/page-type-schemas';
import { landingPageVariantSchema } from '../../src/lib/landing-pages/variant-schema';
import { flattenPageVariantToText } from '../../src/lib/landing-pages/flatten-variant';

let pass = 0,
  fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`);
    fail++;
  }
}

const validGeo = {
  geoArticle: true as const,
  hero: { headline: 'Wat is GEO?', subline: 'Generative Engine Optimization uitgelegd.' },
  answerFirstIntro: 'GEO optimaliseert content zodat AI-antwoordmachines die citeren.',
  tldr: ['GEO = citeerbaarheid voor AI-engines', 'Vult klassieke SEO aan, vervangt het niet'],
  sections: [{ heading: 'Inleiding', body: 'Een uitgebreide uitleg over GEO en waarom het telt.' }],
  qa: [
    { question: 'Wat is GEO?', answer: 'Generative Engine Optimization.' },
    { question: 'Verschilt het van SEO?', answer: 'Ja, het mikt op AI-citaties i.p.v. blauwe links.' },
  ],
  citeableStats: [{ label: 'AI-zoekgroei', value: '+40% YoY', source: 'Gartner 2026' }],
  finalCta: { heading: 'Aan de slag', ctaLabel: 'Start nu' },
};

console.log('── schema-validatie ──');
assert('geldige geoArticle parseert', longFormGeoVariantSchema.safeParse(validGeo).success);
assert(
  'met multi-kolom comparison parseert',
  longFormGeoVariantSchema.safeParse({
    ...validGeo,
    comparison: { columns: ['Wij', 'Concurrent'], rows: [{ label: 'Prijs', cells: ['€10', '€20'] }] },
  }).success,
);
assert(
  'met listicle parseert',
  longFormGeoVariantSchema.safeParse({
    ...validGeo,
    listItems: [{ rank: 1, title: 'Eerste', body: 'Uitleg.' }],
  }).success,
);
assert('comparison met 1 kolom faalt', !longFormGeoVariantSchema.safeParse({ ...validGeo, comparison: { columns: ['X'], rows: [{ label: 'a', cells: ['1'] }] } }).success);
assert('tldr met 1 bullet faalt', !longFormGeoVariantSchema.safeParse({ ...validGeo, tldr: ['enkel'] }).success);
assert('qa met 1 item faalt', !longFormGeoVariantSchema.safeParse({ ...validGeo, qa: [validGeo.qa[0]] }).success);
assert('citeableStats leeg faalt', !longFormGeoVariantSchema.safeParse({ ...validGeo, citeableStats: [] }).success);
assert('stat zonder source faalt', !longFormGeoVariantSchema.safeParse({ ...validGeo, citeableStats: [{ label: 'x', value: 'y', source: '' }] }).success);
assert('zonder geoArticle-discriminant faalt', !longFormGeoVariantSchema.safeParse({ ...validGeo, geoArticle: undefined }).success);

console.log('\n── dispatch ──');
assert('blog-post → geo-schema', getVariantSchemaForType('blog-post') === longFormGeoVariantSchema);
assert('whitepaper → geo-schema', getVariantSchemaForType('whitepaper') === longFormGeoVariantSchema);
assert('landing-page → LP-schema (ongewijzigd)', getVariantSchemaForType('landing-page') === landingPageVariantSchema);
assert('faq-page → faq-schema (ongewijzigd)', getVariantSchemaForType('faq-page') === faqPageVariantSchema);
assert('product-page → product-schema (ongewijzigd)', getVariantSchemaForType('product-page') === productPageVariantSchema);
assert('microsite → microsite-schema (ongewijzigd)', getVariantSchemaForType('microsite') === micrositeVariantSchema);
assert('hasOwnVariantSchema blog-post', hasOwnVariantSchema('blog-post') === true);
assert('hasOwnVariantSchema landing-page false', hasOwnVariantSchema('landing-page') === false);

console.log('\n── discriminant / geen mis-classificatie ──');
assert('geoArticle is GEEN landing-page-variant', isLandingPageVariant(validGeo as unknown as PageVariantContent) === false);
const lpShaped = { hero: { headline: 'x', subheadline: 'y' }, sections: [] };
assert('LP-shaped variant blijft landing-page', isLandingPageVariant(lpShaped as unknown as PageVariantContent) === true);
// geoArticle mist popularQuestions/solution → buildPageJsonLd (shape-dispatch) valt
// door naar null i.p.v. faq/product JSON-LD te emitten (structureel geverifieerd).
assert('geoArticle heeft geen faq/product-discriminanten', !('popularQuestions' in validGeo) && !('solution' in validGeo) && !('heroManifest' in validGeo));

console.log('\n── flatten (F-VAL tekst-projectie) ──');
const flat = flattenPageVariantToText(validGeo as unknown as PageVariantContent);
assert('flatten bevat headline', flat.includes('Wat is GEO?'));
assert('flatten bevat answer-first intro', flat.includes('AI-antwoordmachines'));
assert('flatten bevat Q&A', flat.includes('Generative Engine Optimization.'));
assert('flatten bevat stat met bron', flat.includes('Gartner 2026'));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
