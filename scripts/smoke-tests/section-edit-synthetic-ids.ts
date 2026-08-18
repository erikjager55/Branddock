/**
 * section-edit-synthetic-ids — bewijst dat de edit-kernel dezelfde secties
 * aanwijst als de preview, en dat een onvindbaar anker niet stil verhuist.
 *
 * Aanleiding (tasks/lp-review-followups.md, robuustheid):
 *  - PageRender synthetiseert `<type>-<index>`-ids voor secties zonder
 *    `props.id`, maar de kernel matchte alleen echte id's. Move/remove/
 *    duplicate/set-props waren dan stille no-ops mét een melding die het
 *    tegendeel suggereerde.
 *  - `addSection` met een onbekend `afterSectionId` plakte de sectie onderaan
 *    en meldde succes — de sectie belandde ergens anders dan aangewezen.
 *
 * Draaien: npx tsx scripts/smoke-tests/section-edit-synthetic-ids.ts
 * Geen DB nodig — pure functies.
 */

import {
  addSection,
  duplicateSection,
  moveSection,
  removeSection,
  sectionContentIndex,
  setSectionProps,
  type EditableTree,
} from '../../src/lib/landing-pages/section-edit-tools';

let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Tree zonder enkel `props.id` — precies de vorm waarop PageRender terugvalt. */
function treeWithoutIds(): EditableTree {
  return {
    content: [
      { type: 'BrandHero', props: { headline: 'Hero' } },
      { type: 'FeatureGrid', props: { headline: 'Features' } },
      { type: 'BrandCTA', props: { ctaLabel: 'Start' } },
    ],
  };
}

/** Tree waarin sectie 1 wél een eigen id heeft. */
function treeWithMixedIds(): EditableTree {
  return {
    content: [
      { type: 'BrandHero', props: { headline: 'Hero' } },
      { type: 'FeatureGrid', props: { id: 'echte-id-1', headline: 'Features' } },
      { type: 'BrandCTA', props: { ctaLabel: 'Start' } },
    ],
  };
}

console.log('\n1. De resolutie zelf');
{
  const tree = treeWithoutIds();
  check('synthetisch id wijst de juiste sectie aan', sectionContentIndex(tree, 'FeatureGrid-1') === 1);
  check('echt id blijft werken', sectionContentIndex(treeWithMixedIds(), 'echte-id-1') === 1);
  check('verkeerd type op die index → geen match', sectionContentIndex(tree, 'BrandCTA-1') === -1);
  check('index buiten de tree → geen match', sectionContentIndex(tree, 'FeatureGrid-9') === -1);
  check('onzin-id → geen match', sectionContentIndex(tree, 'zomaar-wat') === -1);
  // De strengheid is het punt: een sectie mét eigen id mag NIET via een
  // synthetisch id te raken zijn, anders bewerk je de verkeerde sectie.
  check(
    'sectie met eigen id is niet synthetisch bereikbaar',
    sectionContentIndex(treeWithMixedIds(), 'FeatureGrid-1') === -1,
  );
}

console.log('\n2. De operaties werken nu op id-loze secties');
{
  const moved = moveSection(treeWithoutIds(), 'FeatureGrid-1', 'up');
  check('move slaagt (was een stille no-op)', moved.ok);
  if (moved.ok) {
    check('en verplaatst écht', moved.data.content[0].type === 'FeatureGrid');
  }

  const removed = removeSection(treeWithoutIds(), 'landing-page', 'FeatureGrid-1');
  check('remove slaagt', removed.ok);
  if (removed.ok) {
    check('en verwijdert écht', removed.data.content.length === 2);
    check('de juiste sectie is weg', !removed.data.content.some((c) => c.type === 'FeatureGrid'));
  }

  const duped = duplicateSection(treeWithoutIds(), 'FeatureGrid-1');
  check('duplicate slaagt', duped.ok);
  if (duped.ok) check('en dupliceert écht', duped.data.content.length === 4);

  const propped = setSectionProps(treeWithoutIds(), 'FeatureGrid-1', { headline: 'Nieuw' });
  check('set-props slaagt', propped.ok);
  if (propped.ok) {
    check('en schrijft op de juiste sectie', propped.data.content[1].props?.headline === 'Nieuw');
  }

  // Bewijs dat de guards blijven gelden: BrandCTA is verplicht voor landing-page.
  const verplicht = removeSection(treeWithoutIds(), 'landing-page', 'BrandCTA-2');
  check('verplichte sectie blijft geweigerd, óók via synthetisch id', !verplicht.ok);
}

console.log('\n3. addSection — een onvindbaar anker is een fout, geen append');
{
  const onbekend = addSection(treeWithoutIds(), { type: 'FAQ', afterSectionId: 'weg-gegooid-id' });
  check('onbekend anker wordt geweigerd', !onbekend.ok);
  check(
    'met een uitlegbare reden',
    !onbekend.ok && onbekend.reason === 'after-section-not-found',
    !onbekend.ok ? onbekend.reason : '',
  );

  const zonderAnker = addSection(treeWithoutIds(), { type: 'FAQ', afterSectionId: null });
  check('géén anker blijft gewoon appenden', zonderAnker.ok);
  if (zonderAnker.ok) {
    check('en zet hem onderaan', zonderAnker.data.content[3].type === 'FAQ');
  }

  // Dít is de eigenlijke winst: mét de resolutie belandt de sectie op de
  // aangewezen plek in plaats van onderaan.
  const naSynthetisch = addSection(treeWithoutIds(), { type: 'FAQ', afterSectionId: 'BrandHero-0' });
  check('synthetisch anker wordt gevonden', naSynthetisch.ok);
  if (naSynthetisch.ok) {
    check('en de sectie staat op positie 1, niet onderaan', naSynthetisch.data.content[1].type === 'FAQ');
  }

  const onbekendType = addSection(treeWithoutIds(), { type: 'BestaatNiet' });
  check('onbekend sectie-type blijft geweigerd', !onbekendType.ok);
}

console.log(`\n${'='.repeat(56)}`);
console.log(`TOTAAL: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
