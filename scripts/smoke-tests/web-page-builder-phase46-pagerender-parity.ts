/**
 * Phase 46 — PageRender-consistentie + registry-sync (E1/E3).
 *
 * Historie: t/m commit dc48688 bewees deze fase byte-gelijke HTML tussen
 * Pucks `<Render>` en de eigen `PageRender` op alle 5 template-trees
 * (15/15 — het E1-acceptatiecriterium). Met de dependency-verwijdering
 * (E3) is de Puck-vergelijking niet meer importeerbaar; de fase bewaakt
 * sindsdien (a) render-zelfconsistentie op dezelfde 5 trees en (b) het
 * registry-contract: SECTION_TYPE_IDS ↔ buildSpikePuckConfig blijven
 * synchroon (de belofte in page-data.ts).
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase46-pagerender-parity.ts
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PageRender } from '../../src/lib/landing-pages/page-render';
import { SECTION_TYPE_IDS } from '../../src/lib/landing-pages/page-data';
import { buildSpikePuckConfig } from '../../src/features/campaigns/components/canvas/medium/puck-config';
import {
  resolveTemplateBuilder,
  type FilledFields,
} from '../../src/features/campaigns/components/canvas/medium/puck-templates';

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

const TYPES = ['landing-page', 'product-page', 'faq-page', 'comparison-page', 'microsite'] as const;

const FILLED: FilledFields = {
  headline: 'Sneller schakelen met je merk',
  sub: 'Alles wat je merk nodig heeft, op één plek.',
  ctaLabel: 'Plan een demo',
  ctaHref: '#contact',
  featureItems: [
    { title: 'Consistent', description: 'Elke uiting in dezelfde merkstem.' },
    { title: 'Sneller', description: 'Van brief naar pagina in minuten.' },
    { title: 'Gevalideerd', description: 'F-VAL bewaakt elke publicatie.' },
  ],
  faqItems: [
    { question: 'Hoe snel staat een pagina live?', answer: 'Binnen enkele minuten na akkoord.' },
    { question: 'Kan ik mijn eigen domein koppelen?', answer: 'Ja, via een CNAME-record.' },
    { question: 'Blijft alles on-brand?', answer: 'Elke wijziging valideert tegen je merkregels.' },
  ],
  testimonialQuote: 'Eindelijk pagina’s die kloppen met ons merk.',
  testimonialAuthor: 'Merkmanager, pilotklant',
  pricingTiers: [{ name: 'Starter', price: '€39', features: '400 credits' }],
  longText: 'Langere toelichting over het aanbod, in meerdere zinnen geschreven.',
};

function main(): void {
  const config = buildSpikePuckConfig(null);

  console.log('\nregistry-sync');
  const registered = new Set(Object.keys(config.components ?? {}));
  const missing = SECTION_TYPE_IDS.filter((id) => !registered.has(id));
  assert('alle SECTION_TYPE_IDS geregistreerd in de config', missing.length === 0, `ontbreekt: ${missing.join(', ')}`);
  const extra = [...registered].filter((k) => !(SECTION_TYPE_IDS as readonly string[]).includes(k));
  assert('geen geregistreerde componenten buiten SECTION_TYPE_IDS', extra.length === 0, `extra: ${extra.join(', ')}`);

  for (const type of TYPES) {
    console.log(`\n${type}`);
    const tree = resolveTemplateBuilder(type)(FILLED, null);

    const rendered = renderToStaticMarkup(
      createElement(PageRender as never, { config, data: tree } as never),
    );
    const bare = renderToStaticMarkup(
      createElement(PageRender as never, { config, data: tree, withSectionMarkers: false } as never),
    );

    assert('render bevat de kern-copy', rendered.includes(FILLED.headline));
    const markerCount = (rendered.match(/data-section-id=/g) ?? []).length;
    assert(`provenance-markers = ${tree.content.length} secties`, markerCount === tree.content.length, `gevonden ${markerCount}`);
    assert(
      'markers zijn layout-neutraal (display:contents)',
      (rendered.match(/display:contents/g) ?? []).length === tree.content.length,
    );
    assert('marker-loze render bevat dezelfde secties (geen markers)', !bare.includes('data-section-id=') && bare.includes(FILLED.headline));
    assert('deterministisch (tweede render identiek)', bare === renderToStaticMarkup(
      createElement(PageRender as never, { config, data: tree, withSectionMarkers: false } as never),
    ));
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main();
