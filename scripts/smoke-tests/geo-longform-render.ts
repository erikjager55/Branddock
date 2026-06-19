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

console.log('\n── optionele blokken (dedicated componenten) ──');
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
const blocks = withExtras.content as Array<{ type: string; props: Record<string, unknown> }>;
const comp = blocks.find((c) => c.type === 'ComparisonTable');
assert('comparison → ComparisonTable component (geen markdown)', !!comp);
assert(
  'ComparisonTable columns als {value}[] (Puck-native)',
  JSON.stringify(comp?.props.columns) === JSON.stringify([{ value: 'Kenmerk' }, { value: 'Wij' }, { value: 'Concurrent' }]),
);
assert(
  'ComparisonTable row.cells als {value}[]',
  JSON.stringify((comp?.props.rows as Array<{ cells: unknown }>)?.[0]?.cells) === JSON.stringify([{ value: '€10' }, { value: '€20' }]),
);
const list = blocks.find((c) => c.type === 'Listicle');
assert('listItems → Listicle component (geen markdown)', !!list);
assert(
  'Listicle behoudt rank (component sorteert bij render)',
  JSON.stringify((list?.props.items as Array<{ rank: number }>).map((i) => i.rank)) === JSON.stringify([2, 1]),
);
const richBlob = blocks.filter((c) => c.type === 'RichText').map((c) => (c.props.content as string) ?? '').join('\n');
assert('definitie gerenderd (RichText)', richBlob.includes('**GEO**'));
assert('bronnen gerenderd als links (RichText)', richBlob.includes('[Gartner](https://example.com)'));
assert('geen markdown-tabel-residu meer in RichText', !richBlob.includes('| Kenmerk |'));

console.log('\n── markdown-escaping (resterende RichText-velden) ──');
const adversarial = buildLongFormGeoTemplateFromStructured(
  {
    ...base,
    definitions: [{ term: 'C[x]', definition: 'def' }],
    sources: [{ title: 'GitHub [Awesome]', url: 'https://x.com/page(1)' }],
    sections: [{ heading: 'Intro [edge]', body: '**intentional** prose' }],
  },
  null,
);
const advRich = (adversarial.content as Array<{ type: string; props: { content?: string } }>)
  .filter((c) => c.type === 'RichText')
  .map((c) => c.props.content ?? '')
  .join('\n');
assert('definitie-term `[]` geëscaped', advRich.includes('C\\[x\\]'));
assert('bron link-tekst `[]` geëscaped', advRich.includes('GitHub \\[Awesome\\]'));
assert('bron-URL parens encoded', advRich.includes('https://x.com/page%281%29'));
assert('sectie-kop `[]` geëscaped', advRich.includes('## Intro \\[edge\\]'));
assert('block-prose (section.body) blijft RAW — geen over-escape', advRich.includes('**intentional** prose'));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
