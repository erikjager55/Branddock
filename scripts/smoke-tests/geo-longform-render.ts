/**
 * Smoke-test — GEO/SEO Fase 2 render-laag: buildLongFormGeoTemplateFromStructured
 * mapt een LongFormGeoVariantContent → Puck-data-tree met de juiste componenten
 * (BrandHero/RichText/StatsBlock/FAQ/BrandCTA) en neemt optionele blokken mee.
 *
 * Run: npx tsx scripts/smoke-tests/geo-longform-render.ts
 */
import { buildLongFormGeoTemplateFromStructured } from '../../src/features/campaigns/components/canvas/medium/puck-templates/long-form-geo-from-structured';
import type { LongFormGeoVariantContent } from '../../src/lib/landing-pages/page-type-schemas';

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

const base: LongFormGeoVariantContent = {
  geoArticle: true,
  hero: { headline: 'Wat is GEO?', subline: 'Generative Engine Optimization uitgelegd.' },
  answerFirstIntro: 'GEO optimaliseert content zodat AI-antwoordmachines die citeren.',
  tldr: ['GEO = citeerbaarheid voor AI', 'Vult SEO aan'],
  sections: [{ heading: 'Inleiding', body: 'Uitleg.' }, { heading: 'Hoe werkt het', body: 'Meer uitleg.' }],
  qa: [
    { question: 'Wat is GEO?', answer: 'Generative Engine Optimization.' },
    { question: 'Anders dan SEO?', answer: 'Ja.' },
  ],
  citeableStats: [{ label: 'AI-zoekgroei', value: '+40%', source: 'Gartner 2026' }],
  finalCta: { heading: 'Aan de slag', ctaLabel: 'Start nu' },
};

function typesOf(content: Array<{ type: string }>): string[] {
  return content.map((c) => c.type);
}

console.log('── basis-render ──');
const tree = buildLongFormGeoTemplateFromStructured(base, null);
const types = typesOf(tree.content as Array<{ type: string }>);
assert('content is een niet-lege array', Array.isArray(tree.content) && tree.content.length > 0);
assert('eerste blok is BrandHero', types[0] === 'BrandHero');
assert('bevat RichText (answer-first + secties)', types.filter((t) => t === 'RichText').length >= 3);
assert('bevat StatsBlock', types.includes('StatsBlock'));
assert('bevat FAQ', types.includes('FAQ'));
assert('bevat BrandCTA', types.includes('BrandCTA'));
assert('eindigt met footer', types[types.length - 1] === 'Footer' || types[types.length - 1] === 'BrandFooter');

console.log('\n── optionele blokken ──');
const withExtras = buildLongFormGeoTemplateFromStructured(
  {
    ...base,
    comparison: { columns: ['Kenmerk', 'Wij', 'Concurrent'], rows: [{ label: 'Prijs', cells: ['€10', '€20'] }] },
    listItems: [{ rank: 2, title: 'Tweede', body: 'b' }, { rank: 1, title: 'Eerste', body: 'a' }],
    definitions: [{ term: 'GEO', definition: 'Generative Engine Optimization' }],
    sources: [{ title: 'Gartner', url: 'https://example.com' }],
  },
  null,
);
const extraRich = (withExtras.content as Array<{ type: string; props: { content?: string } }>).filter(
  (c) => c.type === 'RichText',
);
const richBlob = extraRich.map((c) => c.props.content ?? '').join('\n');
assert('comparison gerenderd als markdown-tabel', richBlob.includes('| Kenmerk | Wij | Concurrent |'));
assert('listicle gesorteerd op rank (Eerste vóór Tweede)', richBlob.indexOf('Eerste') < richBlob.indexOf('Tweede'));
assert('definitie gerenderd', richBlob.includes('**GEO**'));
assert('bronnen gerenderd als links', richBlob.includes('[Gartner](https://example.com)'));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
