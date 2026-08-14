/**
 * Phase 47 — section-edit-tools: structurele operaties + guards (A4/B1-kernel).
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase47-section-edit-tools.ts
 */
import {
  addSection,
  applyStructureOperations,
  canRemoveSection,
  duplicateSection,
  moveSection,
  removeSection,
  setSectionProps,
} from '../../src/lib/landing-pages/section-edit-tools';
import { toggleComponentLock } from '../../src/lib/landing-pages/component-lock';

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
      { type: 'BrandHero', props: { id: 'hero-1', headline: 'H' } },
      { type: 'FeatureGrid', props: { id: 'grid-1' } },
      { type: 'BrandCTA', props: { id: 'cta-1', label: 'Go' } },
    ],
  };
}

console.log('\n1. move/duplicate/remove basis');
{
  const t = makeTree();
  const up = moveSection(t, 'grid-1', 'up');
  assert('move up verplaatst', up.ok && up.data.content[0].props?.id === 'grid-1');
  assert('input niet gemuteerd', t.content[0].props?.id === 'hero-1');
  const oob = moveSection(t, 'hero-1', 'up');
  assert('move out-of-bounds geweigerd', !oob.ok && oob.reason === 'out-of-bounds');
  const dup = duplicateSection(t, 'grid-1');
  assert('duplicate voegt kopie direct erna toe', dup.ok && dup.data.content.length === 4 && dup.data.content[2].type === 'FeatureGrid');
  assert('duplicate krijgt nieuw id', dup.ok && dup.data.content[2].props?.id !== 'grid-1');
  const rm = removeSection(t, 'landing-page', 'grid-1');
  assert('optionele sectie verwijderbaar', rm.ok && rm.data.content.length === 2);
}

console.log('\n2. verplichte-sectie-guard per type');
{
  const t = makeTree();
  const g = canRemoveSection(t, 'landing-page', 'hero-1');
  assert('laatste BrandHero op landing-page geweigerd', !g.ok && g.reasonCode === 'required');
  const dup = duplicateSection(t, 'hero-1');
  const g2 = dup.ok ? canRemoveSection(dup.data, 'landing-page', 'hero-1') : { ok: false };
  assert('niet-laatste BrandHero wél verwijderbaar', g2.ok === true);
  const gFaq = canRemoveSection(t, 'faq-page', 'cta-1');
  assert('BrandCTA op faq-page niet verplicht', gFaq.ok === true);
  const gUnknownType = canRemoveSection(t, 'onbekend-type', 'hero-1');
  assert('onbekend content-type → geen verplichte set', gUnknownType.ok === true);
}

console.log('\n3. lock-respect');
{
  const t = makeTree();
  const locked = toggleComponentLock(t as never, 'cta-1') as unknown as ReturnType<typeof makeTree>;
  const g = canRemoveSection(locked, 'landing-page', 'cta-1');
  assert('gelockte sectie niet verwijderbaar', !g.ok && g.reasonCode === 'locked');
  const sp = setSectionProps(locked, 'cta-1', { label: 'X' });
  assert('gelockte sectie geen prop-edits', !sp.ok && sp.reason === 'locked');
}

console.log('\n4. setSectionProps + addSection');
{
  const t = makeTree();
  const sp = setSectionProps(t, 'cta-1', { label: 'Nieuw' });
  assert('props gemerged', sp.ok && sp.data.content[2].props?.label === 'Nieuw');
  const spId = setSectionProps(t, 'cta-1', { id: 'hack' });
  assert('id-wijziging geweigerd', !spId.ok && spId.reason === 'identity-immutable');
  const addUnknown = addSection(t, { type: 'NietBestaand' });
  assert('onbekend sectie-type geweigerd', !addUnknown.ok && addUnknown.reason === 'unknown-type');
  const add = addSection(t, { type: 'StatsBlock', afterSectionId: 'hero-1' });
  assert('addSection na hero', add.ok && add.data.content[1].type === 'StatsBlock');
  assert('addSection krijgt id', add.ok && typeof add.data.content[1].props?.id === 'string');
}


// ─── Batch-operaties (B1 update_landing_page_structure-kernel) ──
{
  console.log('\n5. applyStructureOperations (batch, alles-of-niets)');
  const t = makeTree();
  const batch = applyStructureOperations(t, 'landing-page', [
    { op: 'add', type: 'StatsBlock', afterSectionId: 'hero-1' },
    { op: 'move', sectionId: 'cta-1', direction: 'up' },
  ]);
  if (batch.ok) {
    assert('batch toegepast', true);
  } else { assert('batch toegepast', false); }
  const failing = applyStructureOperations(t, 'landing-page', [
    { op: 'add', type: 'StatsBlock' },
    { op: 'remove', sectionId: 'hero-1' },
  ]);
  if (!failing.ok && failing.reason === 'required' && failing.opIndex === 1) {
    assert('alles-of-niets: guard-fail geeft reason+opIndex', true);
  } else { assert('alles-of-niets: guard-fail geeft reason+opIndex', false); }
  if (t.content.length === 3) {
    assert('input ongemuteerd na batch', true);
  } else { assert('input ongemuteerd na batch', false); }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
