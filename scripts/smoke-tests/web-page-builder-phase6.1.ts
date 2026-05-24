/**
 * Smoke-test voor Phase 6.1 — diff-merge utility.
 *
 * Verifies the per-component accept logic used by PageDiffPreviewModal:
 *  - diffComponentIds detects only prop-level differences
 *  - mergeAcceptedComponents swaps only ids in the accept-set
 *  - 'all' accepts every proposed component
 *  - Unknown ids in accept-set are silently ignored
 *  - Order is preserved from current (proposals never reorder)
 *  - Original trees are not mutated (immutability)
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase6.1.ts
 */

import {
  diffComponentIds,
  mergeAcceptedComponents,
  type DiffMergeData,
} from '../../src/lib/landing-pages/diff-merge';

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

function group(name: string): void {
  console.log(`\n${name}`);
}

const CURRENT: DiffMergeData = {
  root: { props: {} },
  content: [
    { type: 'BrandHero', props: { id: 'h-1', headline: 'Original headline', sub: 'Original sub' } },
    { type: 'FeatureGrid', props: { id: 'f-1', columns: '3', features: [] } },
    { type: 'BrandCTA', props: { id: 'c-1', label: 'Click', href: '#' } },
    { type: 'Footer', props: { id: 'foot-1', companyName: 'X', tagline: 'T' } },
  ],
};

const PROPOSED: DiffMergeData = {
  root: { props: {} },
  content: [
    { type: 'BrandHero', props: { id: 'h-1', headline: 'NEW headline', sub: 'NEW sub' } },
    { type: 'FeatureGrid', props: { id: 'f-1', columns: '3', features: [] } }, // unchanged
    { type: 'BrandCTA', props: { id: 'c-1', label: 'Click here', href: '#' } },
    { type: 'Footer', props: { id: 'foot-1', companyName: 'X', tagline: 'NEW tagline' } },
  ],
};

function testDiffComponentIds(): void {
  group('1. diffComponentIds — detect prop-level changes');

  const diff = diffComponentIds(CURRENT, PROPOSED);
  assert(`3 components differ (got ${diff.length})`, diff.length === 3);
  assert('h-1 in diff', diff.includes('h-1'));
  assert('c-1 in diff', diff.includes('c-1'));
  assert('foot-1 in diff', diff.includes('foot-1'));
  assert('f-1 NOT in diff (unchanged)', !diff.includes('f-1'));

  group('2. diffComponentIds — identical trees yield empty diff');
  const identical = diffComponentIds(CURRENT, CURRENT);
  assert('empty diff for identical', identical.length === 0);
}

function testMergeSelected(): void {
  group('3. mergeAcceptedComponents — selective accept');

  const merged = mergeAcceptedComponents(CURRENT, PROPOSED, ['h-1', 'c-1']);
  assert('merged tree length unchanged', merged.content.length === CURRENT.content.length);

  const hero = merged.content.find((c) => c.props.id === 'h-1')?.props;
  assert(
    'h-1 has NEW headline',
    (hero as { headline?: string })?.headline === 'NEW headline',
  );

  const cta = merged.content.find((c) => c.props.id === 'c-1')?.props;
  assert(
    'c-1 has NEW label',
    (cta as { label?: string })?.label === 'Click here',
  );

  const footer = merged.content.find((c) => c.props.id === 'foot-1')?.props;
  assert(
    'foot-1 keeps ORIGINAL tagline (not accepted)',
    (footer as { tagline?: string })?.tagline === 'T',
  );

  group('4. mergeAcceptedComponents — "all" accepts everything proposed');
  const mergedAll = mergeAcceptedComponents(CURRENT, PROPOSED, 'all');
  const allFooter = mergedAll.content.find((c) => c.props.id === 'foot-1')?.props;
  assert(
    'foot-1 has NEW tagline when all accepted',
    (allFooter as { tagline?: string })?.tagline === 'NEW tagline',
  );

  group('5. mergeAcceptedComponents — unknown ids silently ignored');
  const mergedUnknown = mergeAcceptedComponents(CURRENT, PROPOSED, ['unknown-id', 'h-1']);
  const heroAfter = mergedUnknown.content.find((c) => c.props.id === 'h-1')?.props;
  assert(
    'h-1 still applied despite unknown sibling',
    (heroAfter as { headline?: string })?.headline === 'NEW headline',
  );
  assert(
    'tree length unchanged',
    mergedUnknown.content.length === CURRENT.content.length,
  );

  group('6. mergeAcceptedComponents — immutability');
  const before = JSON.stringify(CURRENT);
  mergeAcceptedComponents(CURRENT, PROPOSED, 'all');
  assert('original CURRENT unchanged', JSON.stringify(CURRENT) === before);

  group('7. mergeAcceptedComponents — empty accept-set leaves current as-is');
  const noOp = mergeAcceptedComponents(CURRENT, PROPOSED, []);
  assert(
    'no-op preserves original headline',
    (noOp.content[0].props as { headline?: string }).headline === 'Original headline',
  );
}

function testOrderPreserved(): void {
  group('8. mergeAcceptedComponents — order preserved from current');

  // Build proposal where order is reversed
  const reversed: DiffMergeData = {
    root: { props: {} },
    content: [...PROPOSED.content].reverse(),
  };
  const merged = mergeAcceptedComponents(CURRENT, reversed, 'all');
  const orderedTypes = merged.content.map((c) => c.type);
  assert(
    'first component is BrandHero (current order)',
    orderedTypes[0] === 'BrandHero',
  );
  assert(
    'last component is Footer (current order)',
    orderedTypes[orderedTypes.length - 1] === 'Footer',
  );

  group('9. mergeAcceptedComponents — values still come from proposal');
  const hero = merged.content[0].props as { headline?: string };
  assert('first slot has NEW headline (value from proposal)', hero.headline === 'NEW headline');
}

async function main(): Promise<void> {
  console.log('Phase 6.1 smoke-test — diff-merge utility');
  testDiffComponentIds();
  testMergeSelected();
  testOrderPreserved();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('SMOKE crashed', err);
  process.exit(2);
});
