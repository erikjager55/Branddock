// =============================================================
// Smoke test voor snapshot-diff engine.
//
// Bouwt twee mock canonical models en verifieert dat:
//  1. Identical models → empty/trivial diff
//  2. Single color change → 1 entry, niet trivial
//  3. Cosmetic change (RGB delta < 3) → marked cosmetic
//  4. Typography swap → typography entries
//  5. Component variant added/removed → component entries
//  6. Trivial diff filter werkt
//
// Usage: npx tsx scripts/test-snapshot-diff.ts
// =============================================================

import { computeSnapshotDiff, summarizeDiff, shortSummary } from '../src/lib/brandstyle/snapshots/snapshot-diff';
import type { DesignSystemModel } from '../src/lib/export/design-system/canonical';

function baseModel(overrides: Partial<DesignSystemModel> = {}): DesignSystemModel {
  return {
    meta: {
      name: 'Test Brand',
      workspaceId: 'ws-1',
      workspaceSlug: 'test-brand',
      generatedAt: new Date().toISOString(),
    },
    colors: {
      primary: { value: '#0D9488', role: 'primary' },
      'on-primary': { value: '#FFFFFF', role: 'on-primary' },
      surface: { value: '#FAFAFA', role: 'surface' },
      'on-surface': { value: '#111111', role: 'on-surface' },
    },
    typography: {
      'headline-display': {
        fontFamily: 'Inter',
        fontSize: '48px',
        fontWeight: 700,
        lineHeight: '1.1',
      },
      'body-md': {
        fontFamily: 'Inter',
        fontSize: '16px',
        fontWeight: 400,
        lineHeight: '1.5',
      },
    },
    rounded: {
      sm: { value: 4 },
      md: { value: 8 },
      lg: { value: 16 },
    },
    spacing: {
      sm: { value: 8 },
      md: { value: 16 },
      lg: { value: 24 },
    },
    elevation: {},
    components: {
      'button-primary': { props: { backgroundColor: '{colors.primary}', textColor: '{colors.on-primary}' } },
    },
    prose: {},
    extensions: {
      brandFoundation: { assets: [], personas: [], competitors: [] },
    },
    ...overrides,
  };
}

function snap(model: DesignSystemModel, capturedAt = new Date().toISOString()) {
  return { capturedAt, tokensJson: model };
}

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ✗ ${label}`);
  }
}

// ─── Test cases ──────────────────────────────────────

console.log('\n── Snapshot diff smoke tests ──\n');

// Test 1: identical
{
  console.log('Test 1: identical models');
  const a = baseModel();
  const b = baseModel();
  const diff = computeSnapshotDiff(snap(a), snap(b));
  assert(diff.isTrivial, 'isTrivial=true');
  assert(diff.colors.length === 0, '0 color changes');
  assert(diff.typography.length === 0, '0 typography changes');
  assert(summarizeDiff(diff).length === 0, 'summary is empty');
}

// Test 2: significant color change
{
  console.log('\nTest 2: primary color significantly changed');
  const a = baseModel();
  const b = baseModel({
    colors: { ...baseModel().colors, primary: { value: '#14B8A6', role: 'primary' } },
  });
  const diff = computeSnapshotDiff(snap(a), snap(b));
  assert(!diff.isTrivial, 'isTrivial=false');
  assert(diff.colors.length === 1, '1 color change');
  assert(diff.colors[0].role === 'primary', 'role is primary');
  assert(diff.colors[0].cosmetic === false, 'NOT cosmetic (large delta)');
  const summary = summarizeDiff(diff);
  assert(summary.length === 1, '1 summary line');
  assert(summary[0].includes('#0D9488') && summary[0].includes('#14B8A6'), 'summary mentions both hexes');
  console.log(`    summary: "${summary[0]}"`);
}

// Test 3: cosmetic change (RGB delta < 3)
{
  console.log('\nTest 3: cosmetic primary change (1 RGB unit delta)');
  const a = baseModel();
  const b = baseModel({
    colors: { ...baseModel().colors, primary: { value: '#0D9489', role: 'primary' } }, // 0D9488 → 0D9489 (1 blue unit)
  });
  const diff = computeSnapshotDiff(snap(a), snap(b));
  assert(diff.colors.length === 1, '1 raw color change');
  assert(diff.colors[0].cosmetic === true, 'cosmetic=true');
  assert(diff.isTrivial, 'isTrivial=true (cosmetic only)');
  const userSummary = summarizeDiff(diff); // default hides cosmetic
  assert(userSummary.length === 0, 'user-facing summary hides cosmetic');
  const fullSummary = summarizeDiff(diff, { includeCosmetic: true });
  assert(fullSummary.length === 1, 'includeCosmetic shows the change');
}

// Test 4: typography change
{
  console.log('\nTest 4: body font swap');
  const a = baseModel();
  const b = baseModel({
    typography: {
      ...baseModel().typography,
      'body-md': { fontFamily: 'Poppins', fontSize: '16px', fontWeight: 400, lineHeight: '1.5' },
    },
  });
  const diff = computeSnapshotDiff(snap(a), snap(b));
  assert(diff.typography.length === 1, '1 typography change');
  assert(diff.typography[0].fields.includes('fontFamily'), 'fontFamily field flagged');
  const summary = summarizeDiff(diff);
  console.log(`    summary: "${summary[0]}"`);
  assert(summary[0].includes('Inter') && summary[0].includes('Poppins'), 'summary mentions both fonts');
}

// Test 5: component added + removed
{
  console.log('\nTest 5: component added + removed');
  const a = baseModel();
  const b = baseModel({
    components: {
      // primary unchanged
      'button-primary': { props: { backgroundColor: '{colors.primary}', textColor: '{colors.on-primary}' } },
      // secondary added
      'button-secondary': { props: { backgroundColor: '{colors.secondary}', textColor: '{colors.on-secondary}' } },
    },
  });
  const diff = computeSnapshotDiff(snap(a), snap(b));
  assert(diff.components.length === 1, '1 component change');
  assert(diff.components[0].from === null, 'added (from null)');
  assert(diff.components[0].variant === 'button-secondary', 'variant=button-secondary');
}

// Test 6: rounded scale change
{
  console.log('\nTest 6: rounded.md changed from 8 to 12');
  const a = baseModel();
  const b = baseModel({
    rounded: { ...baseModel().rounded, md: { value: 12 } },
  });
  const diff = computeSnapshotDiff(snap(a), snap(b));
  assert(diff.rounded.length === 1, '1 rounded change');
  assert(diff.rounded[0].key === 'md', 'key=md');
  assert(diff.rounded[0].from === 8 && diff.rounded[0].to === 12, 'from=8 to=12');
}

// Test 7: shortSummary
{
  console.log('\nTest 7: shortSummary multi-category');
  const a = baseModel();
  const b = baseModel({
    colors: { ...baseModel().colors, primary: { value: '#14B8A6', role: 'primary' } },
    typography: {
      ...baseModel().typography,
      'body-md': { fontFamily: 'Poppins', fontSize: '16px', fontWeight: 400, lineHeight: '1.5' },
    },
    rounded: { ...baseModel().rounded, md: { value: 12 } },
  });
  const diff = computeSnapshotDiff(snap(a), snap(b));
  const short = shortSummary(diff);
  console.log(`    short: "${short}"`);
  assert(short.includes('color') && short.includes('typography') && short.includes('token'), 'covers all 3 categories');
}

console.log('\n── All tests done ──\n');
