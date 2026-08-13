/**
 * Phase 48 — preview-editing (A3): pure tekst-veld-matching voor inline edit.
 * Bewaakt dat een klik (sectie-id + textContent + occurrence) deterministisch
 * naar het juiste `collectEditableTextFields`-pad herleidt — of naar níets bij
 * ambiguïteit (nooit gokken, dan geen edit).
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase48-preview-editing.ts
 */
import {
  findEditableTextPath,
  sectionContentIndex,
} from '../../src/features/campaigns/components/canvas/medium/preview-edit-matching';

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

function makeTree() {
  return {
    root: { props: {} },
    content: [
      {
        type: 'BrandHero',
        props: {
          id: 'hero-1',
          headline: 'Groei zonder gedoe',
          sub: 'Start vandaag',
          ctaLabel: 'Probeer gratis',
          href: '#pricing',
        },
      },
      {
        type: 'FeatureGrid',
        props: {
          id: 'grid-1',
          heading: 'Waarom wij',
          items: [
            { title: 'Snel', description: 'Start vandaag' },
            { title: 'Veilig', description: 'ISO-gecertificeerd' },
          ],
        },
      },
      { type: 'BrandCTA', props: { id: 'cta-1', label: 'Probeer gratis' } },
      {
        type: 'FAQ',
        props: {
          id: 'faq-1',
          items: [
            { question: 'Wat kost het?', answer: 'Niks' },
            { question: 'Wat kost het?', answer: 'Alles' },
          ],
        },
      },
      { type: 'RichText', props: { content: 'Lorem ipsum' } },
    ],
  };
}

console.log('\n1. unieke match binnen een sectie');
{
  const t = makeTree();
  const m = findEditableTextPath(t, 'hero-1', 'Groei zonder gedoe');
  assert('headline matcht op exact pad', m?.path === 'content[0].props.headline');
  assert('match levert tree-waarde', m?.value === 'Groei zonder gedoe');
  const trimmed = findEditableTextPath(t, 'hero-1', '  Groei zonder gedoe \n');
  assert('DOM-whitespace rond de tekst is getrimd', trimmed?.path === 'content[0].props.headline');
  const nested = findEditableTextPath(t, 'grid-1', 'ISO-gecertificeerd');
  assert('genest array-veld matcht', nested?.path === 'content[1].props.items[1].description');
}

console.log('\n2. duplicaat-waarden over secties heen → sectie-scoping wint');
{
  const t = makeTree();
  const inHero = findEditableTextPath(t, 'hero-1', 'Probeer gratis');
  assert('klik in hero → hero-ctaLabel', inHero?.path === 'content[0].props.ctaLabel');
  const inCta = findEditableTextPath(t, 'cta-1', 'Probeer gratis');
  assert('klik in CTA → cta-label', inCta?.path === 'content[2].props.label');
  const subInHero = findEditableTextPath(t, 'hero-1', 'Start vandaag');
  assert('dubbele waarde in andere sectie lekt niet mee', subInHero?.path === 'content[0].props.sub');
}

console.log('\n3. duplicaten binnen één sectie → occurrence-volgorde');
{
  const t = makeTree();
  const first = findEditableTextPath(t, 'faq-1', 'Wat kost het?', 0);
  assert('occurrence 0 → eerste veld', first?.path === 'content[3].props.items[0].question');
  const second = findEditableTextPath(t, 'faq-1', 'Wat kost het?', 1);
  assert('occurrence 1 → tweede veld', second?.path === 'content[3].props.items[1].question');
  const beyond = findEditableTextPath(t, 'faq-1', 'Wat kost het?', 2);
  assert('occurrence voorbij de kandidaten → ambigu, geen match', beyond === null);
  const negative = findEditableTextPath(t, 'faq-1', 'Wat kost het?', -1);
  assert('negatieve occurrence → geen match', negative === null);
}

console.log('\n4. geen match / niet-bewerkbare velden');
{
  const t = makeTree();
  assert('onbekende tekst → null', findEditableTextPath(t, 'hero-1', 'Bestaat niet') === null);
  assert('lege tekst → null', findEditableTextPath(t, 'hero-1', '   ') === null);
  assert('href-waarde is geen copy-veld', findEditableTextPath(t, 'hero-1', '#pricing') === null);
  assert('onbekend sectie-id → null', findEditableTextPath(t, 'ghost-9', 'Groei zonder gedoe') === null);
  assert('kapotte tree → null', findEditableTextPath(null, 'hero-1', 'Groei zonder gedoe') === null);
}

console.log('\n5. sectie-index-resolutie (props.id + PageRender-fallback)');
{
  const t = makeTree();
  assert('props.id resolvet', sectionContentIndex(t, 'grid-1') === 1);
  assert('synthetisch <type>-<index>-id resolvet', sectionContentIndex(t, 'RichText-4') === 4);
  assert(
    'synthetisch id op verkeerde index → -1',
    sectionContentIndex(t, 'RichText-1') === -1,
  );
  assert(
    'synthetisch id matcht niet op sectie mét eigen props.id',
    sectionContentIndex(t, 'BrandHero-0') === -1,
  );
  const viaFallback = findEditableTextPath(t, 'RichText-4', 'Lorem ipsum');
  assert('match via fallback-id', viaFallback?.path === 'content[4].props.content');
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
