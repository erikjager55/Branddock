/**
 * Smoke-test voor edit-distance helper (sub-sprint #6.B).
 *
 * Run: npx tsx scripts/smoke-tests/edit-distance.ts
 */

import { computeEditDistance, isSignificantEdit } from '../../src/lib/content-test/edit-distance';

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

console.log('\n=== Edit-distance smoke ===\n');

// ─── Identical input ────────────────────────────────────────
console.log('## Identical\n');
assert('identical strings → 0', computeEditDistance('hello world', 'hello world') === 0);
assert(
  'whitespace-difference (newline) → 0',
  computeEditDistance('hello\n\nworld', 'hello world') === 0,
);
assert(
  'case-difference → 0',
  computeEditDistance('Hello World', 'hello world') === 0,
);

// ─── Small edits ────────────────────────────────────────────
console.log('\n## Small edits\n');
const oneCharSwap = computeEditDistance('hello world', 'hello world!');
assert(
  '1 char added (12 chars max) → distance ~0.08',
  oneCharSwap > 0 && oneCharSwap < 0.1,
);
assert('small edit → NOT significant', !isSignificantEdit(oneCharSwap));

// ─── Significant edits ──────────────────────────────────────
console.log('\n## Significant edits\n');
const halfRewrite = computeEditDistance(
  'Dit is een blogpost over duurzaamheid.',
  'Dit is een artikel over circulaire economie.',
);
assert('half-rewrite > 0.2', halfRewrite > 0.2);
assert('half-rewrite → significant', isSignificantEdit(halfRewrite));

// ─── Total rewrite ──────────────────────────────────────────
console.log('\n## Total rewrite\n');
const totalRewrite = computeEditDistance(
  'Premium servies voor restaurants.',
  'Heel iets totaal anders dat geen woord deelt.',
);
assert('total rewrite > 0.5', totalRewrite > 0.5);
assert('total rewrite → significant', isSignificantEdit(totalRewrite));

// ─── Empty cases ────────────────────────────────────────────
console.log('\n## Empty cases\n');
assert('both empty → 0', computeEditDistance('', '') === 0);
assert('empty → text = 1', computeEditDistance('', 'hello world') === 1);
assert('text → empty = 1', computeEditDistance('hello world', '') === 1);

// ─── Threshold boundary ─────────────────────────────────────
console.log('\n## Threshold boundary\n');
assert('exactly 0.2 → NOT significant (strict >)', !isSignificantEdit(0.2));
assert('0.21 → significant', isSignificantEdit(0.21));
assert('0.0 → not significant', !isSignificantEdit(0));
assert('1.0 → significant', isSignificantEdit(1));

// ─── Truncation safety ──────────────────────────────────────
console.log('\n## Truncation safety\n');
const huge1 = 'a'.repeat(10000);
const huge2 = 'b'.repeat(10000);
const t0 = Date.now();
const hugeDist = computeEditDistance(huge1, huge2);
const t1 = Date.now();
assert('10k char input completes within 1s', t1 - t0 < 1000);
assert('10k a vs 10k b → 1', hugeDist === 1);

console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
process.exit(fail > 0 ? 1 : 0);
