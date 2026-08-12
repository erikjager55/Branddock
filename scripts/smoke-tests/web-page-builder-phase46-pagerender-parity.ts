/**
 * Phase 46 — PageRender ↔ Puck-Render pariteit (E1, ADR
 * 2026-08-07-puck-exit-sectie-editor).
 *
 * Acceptatiecriterium van de exit: de eigen render-loop produceert voor
 * álle 5 template-trees exact dezelfde HTML als Pucks `<Render>` (modulo
 * de opt-in provenance-wrappers). Byte-gelijke output = bewijs dat de
 * publieke route, previews en screenshotter zonder visuele regressie op
 * de eigen loop kunnen draaien.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase46-pagerender-parity.ts
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Render } from '@puckeditor/core';
import { PageRender } from '../../src/lib/landing-pages/page-render';
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

  for (const type of TYPES) {
    console.log(`\n${type}`);
    const tree = resolveTemplateBuilder(type)(FILLED, null);

    const viaPuck = renderToStaticMarkup(
      createElement(Render as never, { config, data: tree } as never),
    );
    const viaOwn = renderToStaticMarkup(
      createElement(PageRender as never, { config, data: tree, withSectionMarkers: false } as never),
    );
    assert(
      'byte-gelijke HTML (zonder markers)',
      viaPuck === viaOwn,
      `puck=${viaPuck.length}b own=${viaOwn.length}b — eerste divergentie op index ${firstDiff(viaPuck, viaOwn)}`,
    );

    const viaOwnMarked = renderToStaticMarkup(
      createElement(PageRender as never, { config, data: tree } as never),
    );
    const markerCount = (viaOwnMarked.match(/data-section-id=/g) ?? []).length;
    assert(
      `provenance-markers = ${tree.content.length} secties`,
      markerCount === tree.content.length,
      `gevonden ${markerCount}`,
    );
    assert(
      'markers zijn layout-neutraal (display:contents)',
      (viaOwnMarked.match(/display:contents/g) ?? []).length === tree.content.length,
    );
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

function firstDiff(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : n;
}

main();
