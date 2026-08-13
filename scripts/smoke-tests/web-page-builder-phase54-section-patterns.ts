/**
 * Phase 54 — sectie-patroonbibliotheek (C1) + swap-fundament (C2).
 *
 * Bewaakt:
 *  1. registry-sync: SECTION_PATTERNS-keys bestaan in SECTION_TYPE_IDS;
 *     elk type heeft precies één 'default' (als eerste), unieke keys.
 *  2. allowedPatternsFor: hard filter op archetype-fit + minItems;
 *     null-archetype krijgt geen gerestricteerde patterns.
 *  3. listPatternOptions: minItems-gefaalde patterns blijven zichtbaar
 *     maar disabled mét reden ('min-items'); archetype filtert hard.
 *  4. resolveSectionPatternKey / sectionPatternItemCount / patternFieldOptions.
 *  5. Byte-compat: render zonder patternKey === render met 'default' ===
 *     render met onbekende key, voor alle 5 pattern-dragende types.
 *  6. Render-injectie per pattern-variant (substrings, structurele markers).
 *  7. De 3 nieuwe anatomie-componenten (TrustStrip/PainBullets/ImpactStats)
 *     renderen met hun copy; SECTION_TYPE_IDS kent ze.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase54-section-patterns.ts
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  allowedPatternsFor,
  listPatternOptions,
  patternFieldOptions,
  patternLabelFor,
  resolveSectionPatternKey,
  SECTION_PATTERN_PROP,
  SECTION_PATTERNS,
  sectionHasPatterns,
  sectionPatternItemCount,
} from '../../src/lib/landing-pages/section-patterns';
import { SECTION_TYPE_IDS } from '../../src/lib/landing-pages/page-data';
import {
  DEFAULT_BRAND_TOKENS,
  type BrandTokens,
} from '../../src/lib/landing-pages/brand-tokens';
import {
  buildSpikePuckConfig,
  type SpikePuckProps,
} from '../../src/features/campaigns/components/canvas/medium/puck-config';
import type { CanvasContextStack } from '../../src/lib/ai/canvas-context';

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

function mockCtx(tokens: BrandTokens): CanvasContextStack {
  return {
    brand: { brandName: 'PatternBrand' },
    concept: null,
    journeyPhase: null,
    medium: null,
    deliverableTypeId: 'landing-page',
    personas: [{ id: 'p1', name: 'Persona Piet', serialized: '', avatarUrl: null }],
    brief: null,
    products: [],
    brandTokens: tokens,
  } as unknown as CanvasContextStack;
}

type ComponentKey = keyof SpikePuckProps;
function render(
  config: ReturnType<typeof buildSpikePuckConfig>,
  name: ComponentKey,
  props: Record<string, unknown>,
): string {
  const def = (config.components as Record<string, { render: (p: never) => unknown }>)[name];
  if (!def) throw new Error(`component ${name} niet in config`);
  return renderToStaticMarkup(createElement(() => def.render(props as never) as never));
}

console.log('\n1. registry-sync — patterns alleen voor bestaande sectie-types');
{
  const typeIds = new Set<string>(SECTION_TYPE_IDS);
  for (const [sectionType, defs] of Object.entries(SECTION_PATTERNS)) {
    assert(`${sectionType} bestaat in SECTION_TYPE_IDS`, typeIds.has(sectionType));
    assert(`${sectionType} heeft 'default' als eerste pattern`, defs[0]?.key === 'default');
    const keys = defs.map((d) => d.key);
    assert(`${sectionType} pattern-keys uniek`, new Set(keys).size === keys.length, keys.join(','));
    assert(`${sectionType} elk pattern heeft NL-label`, defs.every((d) => d.label.trim().length > 0));
  }
  assert('SECTION_PATTERN_PROP is patternKey', SECTION_PATTERN_PROP === 'patternKey');
  assert('5 pattern-dragende types', Object.keys(SECTION_PATTERNS).length === 5);
  assert('sectionHasPatterns(FeatureGrid) true', sectionHasPatterns('FeatureGrid'));
  assert('sectionHasPatterns(BrandHero) false (hero heeft eigen mechanisme)', !sectionHasPatterns('BrandHero'));
}

console.log('\n2. allowedPatternsFor — archetype-filter');
{
  const jester = allowedPatternsFor('FeatureGrid', 'JESTER', 4).map((d) => d.key);
  assert('JESTER krijgt bento', jester.includes('bento'), jester.join(','));
  const ruler = allowedPatternsFor('FeatureGrid', 'RULER', 4).map((d) => d.key);
  assert('RULER krijgt geen bento (allowShadow none + forceFlatCards)', !ruler.includes('bento'), ruler.join(','));
  assert('RULER houdt default + alternating', ruler.includes('default') && ruler.includes('alternating'));
  const sage = allowedPatternsFor('StatsBlock', 'SAGE', 3).map((d) => d.key);
  assert('SAGE krijgt stats-cards', sage.includes('cards'));
  const rulerStats = allowedPatternsFor('StatsBlock', 'RULER', 3).map((d) => d.key);
  assert('RULER krijgt geen stats-cards', !rulerStats.includes('cards'));
  const nullArch = allowedPatternsFor('FeatureGrid', null, 4).map((d) => d.key);
  assert('null-archetype: geen gerestricteerde patterns (bento vraagt evidence)', !nullArch.includes('bento'));
  assert('null-archetype: onbeperkte patterns wél', nullArch.includes('default') && nullArch.includes('alternating'));
  const unknownType = allowedPatternsFor('BrandHero', 'JESTER', 3);
  assert('type zonder patterns → lege lijst', unknownType.length === 0);
}

console.log('\n3. allowedPatternsFor — minItems-filter');
{
  const twoFeatures = allowedPatternsFor('FeatureGrid', 'JESTER', 2).map((d) => d.key);
  assert('2 features: bento (min 3) weggefilterd', !twoFeatures.includes('bento'));
  assert('2 features: alternating (min 2) toegestaan', twoFeatures.includes('alternating'));
  const oneFeature = allowedPatternsFor('FeatureGrid', 'JESTER', 1).map((d) => d.key);
  assert('1 feature: alleen default', oneFeature.length === 1 && oneFeature[0] === 'default');
  const faq3 = allowedPatternsFor('FAQ', 'SAGE', 3).map((d) => d.key);
  assert('FAQ 3 items: two-column (min 4) weggefilterd', !faq3.includes('two-column'));
  const faq5 = allowedPatternsFor('FAQ', 'SAGE', 5).map((d) => d.key);
  assert('FAQ 5 items: two-column toegestaan', faq5.includes('two-column'));
}

console.log('\n4. listPatternOptions — uitgrijzen mét reden (C2-kiezer)');
{
  const opts = listPatternOptions('FeatureGrid', 'JESTER', 2);
  const bento = opts.find((o) => o.definition.key === 'bento');
  assert('bento zichtbaar maar disabled bij 2 items', bento !== undefined && !bento.enabled);
  assert('disabled-reason is min-items', bento?.disabledReason === 'min-items');
  const alternating = opts.find((o) => o.definition.key === 'alternating');
  assert('alternating enabled bij 2 items', alternating?.enabled === true && alternating.disabledReason === null);
  const rulerOpts = listPatternOptions('FeatureGrid', 'RULER', 9).map((o) => o.definition.key);
  assert('archetype filtert hard (RULER ziet bento niet eens)', !rulerOpts.includes('bento'));
}

console.log('\n5. resolve/itemCount/fieldOptions-helpers');
{
  assert('resolve: undefined → default', resolveSectionPatternKey('FeatureGrid', undefined) === 'default');
  assert('resolve: onbekende key → default (forward-compat)', resolveSectionPatternKey('FeatureGrid', 'holo-deck') === 'default');
  assert('resolve: geldige key blijft', resolveSectionPatternKey('FeatureGrid', 'bento') === 'bento');
  assert('resolve: key van ander type → default', resolveSectionPatternKey('FAQ', 'bento') === 'default');
  assert('itemCount FeatureGrid telt features', sectionPatternItemCount('FeatureGrid', { features: [1, 2, 3] }) === 3);
  assert('itemCount FAQ telt items', sectionPatternItemCount('FAQ', { items: [1] }) === 1);
  assert('itemCount StatsBlock telt items', sectionPatternItemCount('StatsBlock', { items: [1, 2] }) === 2);
  assert('itemCount Testimonial = 1 (één quote-blok)', sectionPatternItemCount('Testimonial', { quote: 'x' }) === 1);
  assert('itemCount zonder props = 0', sectionPatternItemCount('FeatureGrid', null) === 0);
  const fieldOpts = patternFieldOptions('FeatureGrid');
  assert('fieldOptions spiegelt registry (E2-props-paneel)', fieldOpts.length === SECTION_PATTERNS.FeatureGrid.length && fieldOpts[0].value === 'default');
  assert('patternLabelFor levert NL-label', patternLabelFor('FeatureGrid', 'bento') === 'Bento-raster');
  assert('patternLabelFor onbekend → null', patternLabelFor('FeatureGrid', 'nope') === null);
}

// ─── Render-checks ───────────────────────────────────────────

const JESTER_TOKENS: BrandTokens = { ...DEFAULT_BRAND_TOKENS, archetype: 'JESTER' };
const config = buildSpikePuckConfig(mockCtx(JESTER_TOKENS));

const FEATURES = [
  { title: 'Alfa-titel', description: 'Alfa-omschrijving', icon: 'zap' },
  { title: 'Beta-titel', description: 'Beta-omschrijving', icon: 'shield' },
  { title: 'Gamma-titel', description: 'Gamma-omschrijving', icon: 'star' },
];
const FAQ_ITEMS = [
  { question: 'Vraag een?', answer: 'Antwoord een.' },
  { question: 'Vraag twee?', answer: 'Antwoord twee.' },
  { question: 'Vraag drie?', answer: 'Antwoord drie.' },
  { question: 'Vraag vier?', answer: 'Antwoord vier.' },
];
const STATS_ITEMS = [
  { value: '410+', label: 'Projecten' },
  { value: '90%', label: 'Retentie' },
];

console.log('\n6. byte-compat — default-key = render zonder patternKey (= onbekende key)');
{
  const cases: Array<{ name: ComponentKey; props: Record<string, unknown> }> = [
    { name: 'FeatureGrid', props: { columns: '3', features: FEATURES, bandTone: 'alt' } },
    { name: 'Testimonial', props: { quote: 'Top ervaring', author: 'Alex', personaId: '' } },
    { name: 'BrandCTA', props: { label: 'Start nu', href: '#go', personaId: '', heading: 'Klaar?', riskReducer: 'Geen risico' } },
    { name: 'FAQ', props: { items: FAQ_ITEMS, heading: 'FAQ kop' } },
    { name: 'StatsBlock', props: { items: STATS_ITEMS, bandTone: 'base' } },
  ];
  for (const c of cases) {
    const without = render(config, c.name, c.props);
    const withDefault = render(config, c.name, { ...c.props, patternKey: 'default' });
    const withUnknown = render(config, c.name, { ...c.props, patternKey: 'niet-bestaand' });
    assert(`${c.name}: 'default' byte-gelijk aan zonder patternKey`, without === withDefault, `len ${without.length} vs ${withDefault.length}`);
    assert(`${c.name}: onbekende key byte-gelijk aan default`, without === withUnknown);
  }
}

console.log('\n7. render-injectie — FeatureGrid patterns');
{
  const base = { columns: '3', features: FEATURES };
  const alt = render(config, 'FeatureGrid', { ...base, patternKey: 'alternating' });
  assert('alternating rendert copy', alt.includes('Alfa-titel') && alt.includes('Gamma-omschrijving'));
  assert('alternating wisselt rij-richting (row-reverse)', alt.includes('row-reverse'));
  const dflt = render(config, 'FeatureGrid', base);
  assert('alternating verschilt van default', alt !== dflt);
  const bento = render(config, 'FeatureGrid', { ...base, patternKey: 'bento' });
  assert('bento rendert copy', bento.includes('Alfa-titel') && bento.includes('Beta-omschrijving'));
  assert('bento: eerste tegel over volle breedte (1 / -1)', bento.includes('grid-column:1 / -1'));
  assert('bento: shadow-cards aanwezig', bento.includes('box-shadow'));
}

console.log('\n8. render-injectie — Testimonial patterns');
{
  const base = { quote: 'Prachtig resultaat', author: 'Sam Tester', personaId: '' };
  const wall = render(config, 'Testimonial', { ...base, patternKey: 'wall' });
  assert('wall rendert quote + auteur', wall.includes('Prachtig resultaat') && wall.includes('Sam Tester'));
  assert('wall gebruikt figure-card (links uitgelijnd)', wall.includes('<figure') && wall.includes('text-align:left'));
  const spotlight = render(config, 'Testimonial', { ...base, patternKey: 'spotlight' });
  assert('spotlight rendert quote + auteur', spotlight.includes('Prachtig resultaat') && spotlight.includes('Sam Tester'));
  assert('spotlight toont decoratief aanhalingsteken', spotlight.includes('“'));
  assert('wall en spotlight verschillen', wall !== spotlight);
}

console.log('\n9. render-injectie — BrandCTA patterns');
{
  const base = { label: 'Plan een demo', href: '#demo', personaId: '', heading: 'Klaar om te groeien?', riskReducer: 'Geen creditcard nodig' };
  const split = render(config, 'BrandCTA', { ...base, patternKey: 'split' });
  assert('split rendert label + heading + riskReducer', split.includes('Plan een demo') && split.includes('Klaar om te groeien?') && split.includes('Geen creditcard nodig'));
  assert('split: tekst links, knop rechts (space-between)', split.includes('justify-content:space-between') && split.includes('text-align:left'));
  const card = render(config, 'BrandCTA', { ...base, patternKey: 'card' });
  assert('card rendert label + heading', card.includes('Plan een demo') && card.includes('Klaar om te groeien?'));
  assert('card is omkaderd (1px border op de kaart)', card.includes('border:1px solid'));
}

console.log('\n10. render-injectie — FAQ two-column + StatsBlock cards');
{
  const two = render(config, 'FAQ', { items: FAQ_ITEMS, heading: 'Vragen', patternKey: 'two-column' });
  assert('two-column rendert alle vragen', two.includes('Vraag een?') && two.includes('Vraag vier?'));
  assert('two-column gebruikt grid-kolommen', two.includes('grid-template-columns'));
  const cards = render(config, 'StatsBlock', { items: STATS_ITEMS, patternKey: 'cards' });
  assert('cards rendert cijfers + labels', cards.includes('410+') && cards.includes('Retentie'));
  assert('cards: omkaderde kaarten met radius', cards.includes('border-radius') && cards.includes('border:1px solid'));
  const row = render(config, 'StatsBlock', { items: STATS_ITEMS });
  assert('cards verschilt van default-rij', cards !== row);
}

console.log('\n11. nieuwe anatomie-componenten (C1 §4a)');
{
  assert('SECTION_TYPE_IDS kent TrustStrip', (SECTION_TYPE_IDS as readonly string[]).includes('TrustStrip'));
  assert('SECTION_TYPE_IDS kent PainBullets', (SECTION_TYPE_IDS as readonly string[]).includes('PainBullets'));
  assert('SECTION_TYPE_IDS kent ImpactStats', (SECTION_TYPE_IDS as readonly string[]).includes('ImpactStats'));

  const trust = render(config, 'TrustStrip', {
    metric: '4,8/5 uit 1.200 reviews',
    items: [{ label: 'Acme BV' }, { label: 'Globex' }],
  });
  assert('TrustStrip rendert metric + labels', trust.includes('4,8/5 uit 1.200 reviews') && trust.includes('Acme BV') && trust.includes('Globex'));

  const pain = render(config, 'PainBullets', {
    heading: 'Herken je dit?',
    bullets: [
      { text: 'Uren kwijt aan handwerk', icon: 'clock' },
      { text: 'Inconsistente uitingen', icon: 'flame' },
    ],
    bridge: 'Het kan anders.',
  });
  assert('PainBullets rendert heading + bullets + bridge', pain.includes('Herken je dit?') && pain.includes('Uren kwijt aan handwerk') && pain.includes('Het kan anders.'));
  assert('PainBullets rendert Lucide-iconen (svg)', pain.includes('<svg'));

  const impact = render(config, 'ImpactStats', {
    heading: 'Bewezen resultaat',
    items: [
      { value: '3x', label: 'Snellere livegang' },
      { value: '87%', label: 'Minder revisierondes' },
    ],
  });
  assert('ImpactStats rendert kop + cijfers + labels', impact.includes('Bewezen resultaat') && impact.includes('3x') && impact.includes('Minder revisierondes'));

  // Registry-sync: de config registreert de 3 nieuwe types (phase46 bewaakt
  // de volledige lijst; hier de gerichte check).
  const registered = Object.keys(config.components ?? {});
  for (const type of ['TrustStrip', 'PainBullets', 'ImpactStats']) {
    assert(`config registreert ${type}`, registered.includes(type));
  }
}

console.log('\n12. patternKey-veld in de fields-metadata (E2-props-paneel gratis)');
{
  const components = config.components as unknown as Record<string, { fields?: Record<string, { type?: string; options?: unknown[] }> }>;
  for (const type of Object.keys(SECTION_PATTERNS)) {
    const field = components[type]?.fields?.[SECTION_PATTERN_PROP];
    assert(`${type} heeft patternKey-select in fields`, field?.type === 'select' && Array.isArray(field.options) && field.options.length === SECTION_PATTERNS[type].length);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
