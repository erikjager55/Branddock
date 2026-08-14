/**
 * Phase 53 — eigen sectie-editor (E2): pure hulplogica uit
 * section-editor-model.ts. Bewaakt lijst-labels, de fields-metadata →
 * paneel-model-mapping (incl. array/custom), de default-props-dispatch voor
 * "Sectie toevoegen" en de drag-drop → kernel-move-vertaling.
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase53-section-editor.ts
 */
import {
  addDefaultsForType,
  EDITOR_VIEWPORT_WIDTHS,
  emptyFilledFields,
  fieldsToPanelModel,
  humanizeFieldKey,
  reorderOperations,
  SECTION_PREVIEW_MAX_LENGTH,
  sectionListLabel,
  type SectionFieldMeta,
} from '../../src/features/campaigns/components/canvas/medium/section-editor-model';
import { applyStructureOperations } from '../../src/lib/landing-pages/section-edit-tools';
import type { CanvasContextStack } from '../../src/lib/ai/canvas-context';

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

console.log('\n1. sectionListLabel — type + eerste tekstregel');
{
  const hero = sectionListLabel({
    type: 'BrandHero',
    props: { id: 'hero-1', eyebrow: '', headline: 'Groei zonder gedoe', sub: 'Start vandaag', heroVisualUrl: 'https://x/y.png' },
  });
  assert('hero → type + headline', hero.type === 'BrandHero' && hero.preview === 'Groei zonder gedoe');
  const faq = sectionListLabel({
    type: 'FAQ',
    props: { id: 'faq-1', items: [{ question: 'Wat kost het?', answer: 'Niks' }] },
  });
  assert('genest array-veld levert eerste tekst', faq.preview === 'Wat kost het?');
  const cta = sectionListLabel({
    type: 'BrandCTA',
    props: { id: 'cta-1', href: '#pricing', personaId: 'p-1', label: 'Probeer gratis' },
  });
  assert('URL-achtige en identiteits-props overgeslagen', cta.preview === 'Probeer gratis');
  const grid = sectionListLabel({
    type: 'FeatureGrid',
    props: { id: 'g-1', columns: '3', features: [{ title: 'Snel', description: 'x' }] },
  });
  assert('select-waarde (columns) geen preview', grid.preview === 'Snel');
  const empty = sectionListLabel({ type: 'BrandNav', props: { id: 'nav-1' } });
  assert('geen tekst → preview null', empty.preview === null);
  const long = sectionListLabel({
    type: 'RichText',
    props: { content: 'a'.repeat(200) },
  });
  assert(
    `lange tekst afgekapt op ${SECTION_PREVIEW_MAX_LENGTH}`,
    long.preview !== null && long.preview.length <= SECTION_PREVIEW_MAX_LENGTH && long.preview.endsWith('…'),
  );
}

console.log('\n2. humanizeFieldKey — leesbare veld-labels');
{
  assert('ctaLabel → CTA label', humanizeFieldKey('ctaLabel') === 'CTA label');
  assert('headline → Headline', humanizeFieldKey('headline') === 'Headline');
  assert('heroVisualUrl → Hero visual URL', humanizeFieldKey('heroVisualUrl') === 'Hero visual URL');
  assert('companyName → Company name', humanizeFieldKey('companyName') === 'Company name');
}

console.log('\n3. fieldsToPanelModel — metadata → paneel-model');
{
  const fields: Record<string, SectionFieldMeta> = {
    headline: { type: 'text' },
    sub: { type: 'textarea' },
    columns: {
      type: 'select',
      options: [
        { label: '2 kolommen', value: '2' },
        { label: '3 kolommen', value: '3' },
      ],
    },
    highlighted: {
      type: 'radio',
      options: [
        { label: 'Normaal', value: false },
        { label: 'Uitgelicht', value: true },
      ],
    },
    rank: { type: 'number' },
    rows: {
      type: 'array',
      arrayFields: {
        label: { type: 'text' },
        cells: { type: 'array', arrayFields: { value: { type: 'text' } } },
      },
      defaultItemProps: { label: 'Rij', cells: [] },
      getItemSummary: ((item: { label: string }) => item.label) as SectionFieldMeta['getItemSummary'],
    },
    heroVisualUrl: { type: 'custom', render: () => 'image-field' },
    mystery: { type: 'wormhole' },
    customZonderRender: { type: 'custom' },
  };
  const panel = fieldsToPanelModel(fields);
  const byKey = new Map(panel.map((f) => [f.key, f]));
  assert('text → text', byKey.get('headline')?.kind === 'text');
  assert('textarea → textarea', byKey.get('sub')?.kind === 'textarea');
  assert('select → select met opties', byKey.get('columns')?.kind === 'select' && byKey.get('columns')?.options?.length === 2);
  const radio = byKey.get('highlighted');
  assert('radio → select met ruwe boolean-waarden', radio?.kind === 'select' && radio.options?.[0]?.value === false && radio.options?.[1]?.value === true);
  assert('number → number', byKey.get('rank')?.kind === 'number');
  const rows = byKey.get('rows');
  assert('array → recursief sub-model', rows?.kind === 'array' && rows.itemFields?.length === 2);
  const cells = rows?.itemFields?.find((f) => f.key === 'cells');
  assert('genest array-in-array gemapt', cells?.kind === 'array' && cells.itemFields?.[0]?.key === 'value');
  assert('defaultItemProps doorgegeven', (rows?.defaultItemProps as { label?: string })?.label === 'Rij');
  assert('itemSummary veilig gewrapt', rows?.itemSummary?.({ label: 'Basis' }, 0) === 'Basis');
  assert('itemSummary faalt nooit (throw → fallback)', rows?.itemSummary?.(null, 4) === '5');
  const custom = byKey.get('heroVisualUrl');
  assert('custom → renderCustom doorgegeven', custom?.kind === 'custom' && typeof custom.renderCustom === 'function');
  assert('label gehumaniseerd', custom?.label === 'Hero visual URL');
  assert('onbekend veld-type overgeslagen', !byKey.has('mystery'));
  assert('custom zonder render overgeslagen', !byKey.has('customZonderRender'));
  assert('lege metadata → leeg model', fieldsToPanelModel(undefined).length === 0);
}

console.log('\n4. addDefaultsForType — factory-dispatch + registry-fallback');
{
  const ctx = {
    brand: { brandName: 'Acme BV' },
    personas: [{ id: 'persona-1', name: 'Piet' }],
  } as unknown as CanvasContextStack;
  const hero = addDefaultsForType('BrandHero', null);
  assert('BrandHero via factory (placeholder-copy)', hero.headline === 'Headline placeholder');
  assert('factory-props zonder id (kernel kent id toe)', !('id' in hero));
  const faq = addDefaultsForType('FAQ', null);
  assert('FAQ-factory levert 3 placeholder-items', Array.isArray(faq.items) && (faq.items as unknown[]).length === 3);
  const footer = addDefaultsForType('Footer', ctx);
  assert('Footer-factory gebruikt brandName uit ctx', footer.companyName === 'Acme BV');
  const footerNoCtx = addDefaultsForType('Footer', null);
  assert('Footer zonder ctx → placeholder-brandName', footerNoCtx.companyName === 'Brand Name');
  const cta = addDefaultsForType('BrandCTA', ctx);
  assert('BrandCTA-factory pakt eerste persona', cta.personaId === 'persona-1');
  const registryDefaults = { items: [{ value: '500+', label: 'Customers' }] };
  const stats = addDefaultsForType('StatsBlock', null, registryDefaults);
  assert('geen factory → registry-defaultProps', Array.isArray(stats.items) && (stats.items as unknown[]).length === 1);
  (stats.items as Array<{ value: string }>)[0].value = 'MUTATIE';
  assert('registry-fallback is deep-cloned', registryDefaults.items[0].value === '500+');
  const unknown = addDefaultsForType('NietBestaand', null);
  assert('geen factory + geen registry → lege props', Object.keys(unknown).length === 0);
  const filled = emptyFilledFields();
  assert('emptyFilledFields is leeg', filled.headline === '' && filled.faqItems.length === 0);
}

console.log('\n5. reorderOperations — drag-drop → kernel-moves');
{
  const content = [
    { type: 'BrandHero', props: { id: 'hero-1' } },
    { type: 'FeatureGrid', props: { id: 'grid-1' } },
    { type: 'Testimonial', props: { id: 'quote-1' } },
    { type: 'BrandCTA', props: { id: 'cta-1' } },
  ];
  const down = reorderOperations(content, 'hero-1', 2);
  assert('omlaag: 2 stappen → 2 move-ops down', down.length === 2 && down.every((o) => o.op === 'move' && o.direction === 'down'));
  const up = reorderOperations(content, 'cta-1', 0);
  assert('omhoog: 3 stappen → 3 move-ops up', up.length === 3 && up.every((o) => o.direction === 'up'));
  assert('zelfde index → geen ops', reorderOperations(content, 'grid-1', 1).length === 0);
  assert('onbekend id → geen ops', reorderOperations(content, 'nope', 0).length === 0);
  assert('out-of-bounds doel → geen ops', reorderOperations(content, 'hero-1', 4).length === 0);

  // Integratie: de ops door de échte kernel — sectie landt op de doelindex.
  const tree = { root: { props: {} }, content: structuredClone(content) };
  const applied = applyStructureOperations(tree, 'landing-page', reorderOperations(content, 'hero-1', 2));
  assert(
    'kernel past drop toe → hero op index 2',
    applied.ok && applied.data.content[2]?.props?.id === 'hero-1' && applied.data.content[0]?.props?.id === 'grid-1',
  );
}

console.log('\n6. viewport-presets');
{
  assert('desktop = volle breedte', EDITOR_VIEWPORT_WIDTHS.desktop === null);
  assert('tablet = 768', EDITOR_VIEWPORT_WIDTHS.tablet === 768);
  assert('mobiel = 375', EDITOR_VIEWPORT_WIDTHS.mobile === 375);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
