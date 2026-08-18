/**
 * Smoke voor `resolvePageTitleFromPuckData` — de titel-afleiding uit de
 * pagina-boom (2026-08-18). Pure functie, geen DB.
 *
 * Achtergrond: een landingspagina zonder `settings.seoChecklist` had géén
 * <title> en in llms.txt alleen zijn slug. De hero-`headline` is de echte kop.
 */
import { resolvePageTitleFromPuckData } from '@/lib/landing-pages/page-title';

let pass = 0;
let fail = 0;
function assert(label: string, condition: boolean) {
  if (condition) {
    pass++;
    console.log(`  PASS ${label}`);
  } else {
    fail++;
    console.log(`  FAIL ${label}`);
  }
}

const section = (type: string, props: Record<string, unknown>) => ({ type, props });

console.log('── hero-headline wint ──');
const page = {
  content: [
    section('BrandHero', { headline: 'Geen omkijken naar textiel. Wel naar gasten.', sub: '…' }),
    section('FAQ', { heading: 'Veelgestelde vragen' }),
  ],
};
assert(
  'headline van de hero wordt de titel',
  resolvePageTitleFromPuckData(page) === 'Geen omkijken naar textiel. Wel naar gasten.',
);

console.log('\n── heading als tweede keus ──');
assert(
  'zonder headline valt hij terug op de eerste heading',
  resolvePageTitleFromPuckData({
    content: [section('RichText', { body: 'tekst' }), section('FeatureGrid', { heading: 'Specificaties' })],
  }) === 'Specificaties',
);
assert(
  'een latere headline wint alsnog van een eerdere heading',
  resolvePageTitleFromPuckData({
    content: [section('FeatureGrid', { heading: 'Sectie-kop' }), section('BrandHero', { headline: 'Echte kop' })],
  }) === 'Echte kop',
);

console.log('\n── niets bruikbaars ──');
assert('lege content → undefined', resolvePageTitleFromPuckData({ content: [] }) === undefined);
assert('geen content-array → undefined', resolvePageTitleFromPuckData({}) === undefined);
assert('null → undefined', resolvePageTitleFromPuckData(null) === undefined);
assert('array i.p.v. object → undefined', resolvePageTitleFromPuckData([]) === undefined);
assert(
  'lege/whitespace-kop telt niet als titel',
  resolvePageTitleFromPuckData({ content: [section('BrandHero', { headline: '   ' })] }) === undefined,
);
assert(
  'niet-string kop telt niet',
  resolvePageTitleFromPuckData({ content: [section('BrandHero', { headline: 42 })] }) === undefined,
);
assert(
  'sectie zonder props wordt overgeslagen',
  resolvePageTitleFromPuckData({
    content: [{ type: 'Broken' }, section('BrandHero', { headline: 'Wel goed' })],
  }) === 'Wel goed',
);

console.log('\n── hygiëne ──');
assert(
  'witruimte wordt genormaliseerd',
  resolvePageTitleFromPuckData({ content: [section('BrandHero', { headline: '  Twee   spaties\n weg ' })] }) ===
    'Twee spaties weg',
);
const long = 'Vloerluik op maat voor elke situatie '.repeat(10);
const capped = resolvePageTitleFromPuckData({ content: [section('BrandHero', { headline: long })] }) ?? '';
assert('lange kop wordt afgekapt', capped.length <= 121 && capped.endsWith('…'));
assert('afkappen gebeurt op een woordgrens', !/\s…$/.test(capped) && !capped.includes('  '));

console.log(`\npage-title: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
