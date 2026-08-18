/**
 * Smoke voor `resolvePageTitleFromPuckData` — de titel-afleiding uit de
 * pagina-boom (2026-08-18). Pure functie, geen DB.
 *
 * Achtergrond: een landingspagina zonder `settings.seoChecklist` had géén
 * <title> en in llms.txt alleen zijn slug. De hero-`headline` is de echte kop.
 */
import {
  resolvePageTitleFromPuckData,
  resolvePageDescriptionFromPuckData,
} from '@/lib/landing-pages/page-derived-meta';

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

console.log('\n── beschrijving: hero-sub wint ──');
assert(
  'hero-sub wordt de beschrijving',
  resolvePageDescriptionFromPuckData({
    content: [
      section('BrandHero', { headline: 'Kop', sub: 'De verborgen prijs van eigen linnengoed-beheer.' }),
      section('RichText', { content: 'Lange lopende tekst.' }),
    ],
  }) === 'De verborgen prijs van eigen linnengoed-beheer.',
);
assert(
  'zonder sub valt hij terug op RichText-content',
  resolvePageDescriptionFromPuckData({
    content: [section('BrandHero', { headline: 'Kop' }), section('RichText', { content: 'Lopende tekst hier.' })],
  }) === 'Lopende tekst hier.',
);
assert(
  'een latere sub wint alsnog van eerdere body-tekst',
  resolvePageDescriptionFromPuckData({
    content: [section('RichText', { content: 'Body eerst.' }), section('BrandHero', { sub: 'Echte pitch.' })],
  }) === 'Echte pitch.',
);

console.log('\n── beschrijving: markdown wordt gestript ──');
assert(
  'kop-marker en vet-markering verdwijnen, de TEKST blijft',
  resolvePageDescriptionFromPuckData({
    content: [section('RichText', { content: '## Kop\n**HACCP-reiniging** — wasproces volgens protocol.' })],
  }) === 'Kop HACCP-reiniging — wasproces volgens protocol.',
);
assert(
  'links worden linktekst',
  resolvePageDescriptionFromPuckData({
    content: [section('RichText', { content: 'Zie [onze werkwijze](https://x.nl/werkwijze) voor details.' })],
  }) === 'Zie onze werkwijze voor details.',
);
assert(
  'lijst-bullets en inline code verdwijnen',
  resolvePageDescriptionFromPuckData({
    content: [section('RichText', { content: '- eerste `punt`\n- tweede punt' })],
  }) === 'eerste punt tweede punt',
);

console.log('\n── beschrijving: lengte + leegte ──');
const longBody = 'Horeca textielbeheer uitbesteden bespaart restaurants gemiddeld acht uur per week. '.repeat(5);
const desc = resolvePageDescriptionFromPuckData({ content: [section('BrandHero', { sub: longBody })] }) ?? '';
assert('lange beschrijving wordt afgekapt', desc.length <= 156 && desc.endsWith('…'));
assert('afkappen op woordgrens', !desc.includes('  '));
assert(
  'lege sub telt niet',
  resolvePageDescriptionFromPuckData({ content: [section('BrandHero', { sub: '   ' })] }) === undefined,
);
assert(
  'markdown die niets overlaat telt niet',
  resolvePageDescriptionFromPuckData({ content: [section('RichText', { content: '## ' })] }) === undefined,
);
assert('geen content-array → undefined', resolvePageDescriptionFromPuckData({}) === undefined);
assert('null → undefined', resolvePageDescriptionFromPuckData(null) === undefined);

console.log(`\npage-derived-meta: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
