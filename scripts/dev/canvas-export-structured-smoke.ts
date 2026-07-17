/**
 * canvas-export-structured-smoke — bewijst dat de canvas-export de structured/PUCK
 * web-page-types ziet, en nooit meer stil een leeg bestand levert.
 *
 * Aanleiding: BugReport 2026-07-16 (pilot-tester) — "de output copy en export html
 * geeft niks terug. leeg bestand". Zijn pillar-page had 23,5KB aan content in
 * `settings.structuredVariantOptions`, maar de export las uitsluitend
 * `DeliverableComponent.generatedContent`. Zijn enige component was een `image`
 * zonder inhoud → export schreef alleen de kopregels.
 *
 * Draaien: npx tsx scripts/dev/canvas-export-structured-smoke.ts
 */

import {
  buildDeliverableBody,
  buildDeliverableExportText,
  type ExportableDeliverable,
} from '../../src/lib/campaigns/export-deliverable-text';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

/**
 * geoArticle-shaped variant — de vorm van een pillar-page (sulejman's type).
 * Velden 1-op-1 die van zijn echte prod-rij (hero, answerFirstIntro, tldr, sections,
 * qa, definitions, comparison, listItems, citeableStats, sources, finalCta).
 */
const geoVariant = {
  geoArticle: true,
  hero: { headline: 'WooCommerce Bol.com Integration: Complete Setup Guide', subline: 'Sync products, stock and orders.' },
  answerFirstIntro: 'A WooCommerce Bol.com integration connects your store to the marketplace.',
  tldr: ['Syncs products, stock and orders in real time', 'Manage listings from one dashboard'],
  sections: [{ heading: 'What Is It', body: 'A connector that links your webshop to the marketplace.' }],
  qa: [{ question: 'How long does setup take?', answer: 'About an hour.' }],
  definitions: [{ term: 'Marketplace sync', definition: 'Two-way updates between systems.' }],
  comparison: {
    caption: 'Manual vs automated',
    columns: ['Manual', 'Automated'],
    rows: [{ label: 'Stock updates', cells: ['Hourly', 'Real time'] }],
  },
  listItems: [],
  citeableStats: [{ label: 'Merchants automating stock', value: '68%', source: 'Example Report, 2025' }],
  sources: [{ title: 'Example Report', url: 'https://example.com/report' }],
  finalCta: { heading: 'Start today', ctaLabel: 'Book a demo' },
};

/** Partial variant: mist arrays die de flattener rechtstreeks itereert. */
const brokenVariant = { geoArticle: true, hero: { headline: 'Kapot' } };

function deliverable(over: Partial<ExportableDeliverable> = {}): ExportableDeliverable {
  return {
    title: 'pillar-page',
    contentType: 'pillar-page',
    status: 'IN_PROGRESS',
    approvalStatus: null,
    settings: {},
    components: [],
    ...over,
  };
}

console.log('\n1. Sulejman’s exacte staat: image-component zonder inhoud + varianten, géén keuze');
{
  // Precies zijn rij: één image-component met generatedContent=null, options gevuld,
  // structuredVariant ONTBREEKT. Vóór de fix leverde dit alleen de kopregels op.
  const d = deliverable({
    components: [{ componentType: 'image', groupType: 'hero', generatedContent: null }],
    settings: { structuredVariantOptions: [geoVariant, geoVariant], mediumConfig: {} },
  });
  const body = buildDeliverableBody(d);
  check('geen stil leeg bestand', body.trim().length > 0);
  check('meldt dat er varianten klaarstaan', body.includes('2 generated variant(s) available'));
  check('vertelt wat de gebruiker moet doen', body.includes('pick a variant in the Canvas'));
  check('claimt NIET "no generated content"', !body.includes('No generated content yet'),
    'content bestaat wél — die melding zou liegen');
}

console.log('\n2. Mét gekozen variant → echte content in de export');
{
  const d = deliverable({
    components: [{ componentType: 'image', groupType: 'hero', generatedContent: null }],
    settings: { structuredVariant: geoVariant, structuredVariantOptions: [geoVariant] },
  });
  const body = buildDeliverableBody(d);
  check('bevat de hero-headline', body.includes('WooCommerce Bol.com Integration'));
  check('bevat de intro', body.includes('connects your store to the marketplace'));
  check('bevat sectie-body', body.includes('links your webshop to the marketplace'));
  check('bevat de Q&A', body.includes('About an hour'));
  check('substantieel (>150 tekens)', body.length > 150, `${body.length} tekens`);
}

console.log('\n3. Component-keten blijft ongewijzigd (geen regressie)');
{
  const d = deliverable({
    contentType: 'blog-post',
    components: [
      { componentType: 'body', groupType: 'text', generatedContent: 'Dit is de body-tekst.' },
      { componentType: 'image', groupType: 'hero', generatedContent: null },
    ],
  });
  const body = buildDeliverableBody(d);
  check('component-content komt door', body.includes('Dit is de body-tekst.'));
  check('kop per component', body.includes('## body (text)'));
  check('lege image-component voegt niets toe', !body.includes('## image'));
  check('valt niet terug op de structured-tak', !body.includes('generated variant(s)'));
}

console.log('\n4. Echt lege deliverable meldt eerlijk niets');
{
  const body = buildDeliverableBody(deliverable());
  check('"No generated content yet"', body.includes('No generated content yet'));
}

console.log('\n5. Volledige export-tekst houdt de kop');
{
  const text = buildDeliverableExportText(
    deliverable({ settings: { structuredVariant: geoVariant } }),
  );
  check('kop aanwezig', text.startsWith('# pillar-page'));
  check('type-regel', text.includes('Type: pillar-page'));
  check('body volgt op de kop', text.includes('WooCommerce Bol.com Integration'));
}

console.log('\n6. Een half-complete opgeslagen variant mag de export niet 500\'en');
{
  // flattenPageVariantToText itereert rechtstreeks over o.a. citeableStats. Een variant
  // van vóór een schema-uitbreiding (of een partial uit een afgebroken run) gooit dan.
  // Zie gotcha 2026-03-24: een opgeslagen AI-payload garandeert zijn schema niet.
  const d = deliverable({ settings: { structuredVariant: brokenVariant } });
  let threw = false;
  let body = '';
  try { body = buildDeliverableBody(d); } catch { threw = true; }
  check('gooit niet', !threw, 'export-route zou 500 geven i.p.v. een bestand');
  check('meldt het eerlijk', body.includes('could not be rendered as text'));
}

console.log('\n7. Defensief tegen rommelige settings (Prisma-JSON kan alles zijn)');
{
  for (const [label, settings] of [
    ['null', null],
    ['array', [1, 2, 3]],
    ['string', 'kapot'],
    ['lege options', { structuredVariantOptions: [] }],
  ] as const) {
    const body = buildDeliverableBody(deliverable({ settings }));
    check(`${label} → geen crash, eerlijke melding`, body.includes('No generated content yet'));
  }
}

console.log(`\n${pass}/${pass + fail} checks groen${fail ? ` — ${fail} FAIL` : ''}\n`);
process.exit(fail ? 1 : 0);
