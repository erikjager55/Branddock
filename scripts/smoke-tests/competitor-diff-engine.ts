/**
 * Smoke-test voor de Competitor diff-engine + snapshot-hash
 * (Fase 1 van Competitive Intelligence Loop, PR-2).
 *
 * Drie lagen:
 *   1. Hash determinisme — canonicalize + computeContentHash
 *   2. Diff-engine 7 rules — TAGLINE / VALUE_PROP / PRICING /
 *      NEW_PRODUCT / PRODUCT_REMOVED / STATUS / TIER
 *   3. No-op detection — null-prev, identical-state, combined events
 *
 * Geen DB, geen AI — pure functies. Run:
 *   npx tsx scripts/smoke-tests/competitor-diff-engine.ts
 */
import { computeDiff } from '@/lib/competitors/diff-engine';
import {
  canonicalize,
  computeContentHash,
  computeScrapeHash,
} from '@/lib/competitors/snapshot-hash';
import type {
  CanonicalExtracted,
  DetectedActivity,
  ManualEventContext,
} from '@/lib/competitors/types';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

function fixture(overrides: Partial<CanonicalExtracted> = {}): CanonicalExtracted {
  return {
    tagline: 'The modern brand platform',
    valueProposition: 'Build brand strategy and content faster.',
    targetAudience: 'B2B marketing teams',
    differentiators: ['unified context', 'autonomous agents'],
    mainOfferings: ['Brand strategy', 'Content generation'],
    pricingModel: 'SaaS subscription',
    pricingDetails: 'Starter $29/mo, Pro $99/mo, Enterprise custom.',
    toneOfVoice: 'Direct, expert',
    messagingThemes: ['speed', 'consistency'],
    visualStyleNotes: 'Teal accents, minimalist',
    strengths: ['integrated', 'fast'],
    weaknesses: ['enterprise-only docs'],
    socialLinks: { LinkedIn: 'https://linkedin.com/x', twitter: 'https://x.com/x' },
    hasBlog: true,
    hasCareersPage: false,
    ...overrides,
  };
}

const baselineWorkflow: ManualEventContext = {
  workflowBefore: { status: 'ANALYZED', tier: 'DIRECT' },
  workflowAfter: { status: 'ANALYZED', tier: 'DIRECT' },
};

function findActivity(
  events: DetectedActivity[],
  type: DetectedActivity['type'],
): DetectedActivity | undefined {
  return events.find((e) => e.type === type);
}

// =============================================================
// LAYER 1: Hash determinisme
// =============================================================
console.log('\n=== LAYER 1: hash determinisme ===\n');

console.log('## canonicalize + computeContentHash');
{
  const a = fixture();
  const b = fixture();
  assert('identical input → identical hash', computeContentHash(a) === computeContentHash(b));

  const whitespace = fixture({ tagline: '  The modern   brand platform  ' });
  assert(
    'whitespace normalization → same hash',
    computeContentHash(fixture()) === computeContentHash(whitespace),
  );

  const reordered = fixture({
    differentiators: ['autonomous agents', 'unified context'],
    mainOfferings: ['Content generation', 'Brand strategy'],
  });
  assert(
    'array order ignored → same hash',
    computeContentHash(fixture()) === computeContentHash(reordered),
  );

  const socialReordered = fixture({
    socialLinks: { twitter: 'https://x.com/x', linkedin: 'https://linkedin.com/x' },
  });
  assert(
    'socialLinks key-case + order ignored → same hash',
    computeContentHash(fixture()) === computeContentHash(socialReordered),
  );

  const taglineChanged = fixture({ tagline: 'A different tagline' });
  assert(
    'tagline change → different hash',
    computeContentHash(fixture()) !== computeContentHash(taglineChanged),
  );

  const triNull = fixture({ hasBlog: null });
  const triTrue = fixture({ hasBlog: true });
  const triFalse = fixture({ hasBlog: false });
  assert('hasBlog tri-state: null vs true different', computeContentHash(triNull) !== computeContentHash(triTrue));
  assert('hasBlog tri-state: true vs false different', computeContentHash(triTrue) !== computeContentHash(triFalse));
  assert('hasBlog tri-state: null vs false different', computeContentHash(triNull) !== computeContentHash(triFalse));
}

console.log('\n## canonicalize structure');
{
  const out = canonicalize(fixture()) as Array<[string, unknown]>;
  assert('output is array of pairs', Array.isArray(out));
  assert('output has 15 entries', out.length === 15);
  assert('first entry is tagline', out[0]?.[0] === 'tagline');
  assert(
    'differentiators is sorted',
    JSON.stringify(out.find(([k]) => k === 'differentiators')?.[1]) ===
      JSON.stringify(['autonomous agents', 'unified context']),
  );
}

console.log('\n## computeScrapeHash');
{
  assert('null input → null hash', computeScrapeHash(null) === null);
  assert('whitespace tolerant', computeScrapeHash('a   b') === computeScrapeHash('a b'));
  assert('different content → different hash', computeScrapeHash('a') !== computeScrapeHash('b'));
}

// =============================================================
// LAYER 2: Diff-engine 7 rules
// =============================================================
console.log('\n=== LAYER 2: diff-engine 7 rules ===\n');

console.log('## Rule 1 — TAGLINE_CHANGED');
{
  const prev = fixture();
  const next = fixture({ tagline: 'A new positioning' });
  const events = computeDiff(prev, next, baselineWorkflow);
  const e = findActivity(events, 'TAGLINE_CHANGED');
  assert('detected on tagline change', e !== undefined);
  assert('severity = NOTABLE', e?.severity === 'NOTABLE');
  assert('detectionMethod = hash-diff', e?.detectionMethod === 'hash-diff');
  assert(
    'diffPayload has before/after',
    e?.diffPayload.kind === 'field-change' &&
      e.diffPayload.before === 'The modern brand platform' &&
      e.diffPayload.after === 'A new positioning',
  );

  const ws = fixture({ tagline: '  The modern   brand platform  ' });
  const noEvents = computeDiff(prev, ws, baselineWorkflow);
  assert(
    'whitespace-only change → no event',
    findActivity(noEvents, 'TAGLINE_CHANGED') === undefined,
  );
}

console.log('\n## Rule 2 — VALUE_PROP_CHANGED');
{
  const prev = fixture();
  const next = fixture({ valueProposition: 'Drive measurable brand growth.' });
  const events = computeDiff(prev, next, baselineWorkflow);
  const e = findActivity(events, 'VALUE_PROP_CHANGED');
  assert('detected on value-prop change', e !== undefined);
  assert('severity = NOTABLE', e?.severity === 'NOTABLE');
}

console.log('\n## Rule 3 — PRICING_CHANGED');
{
  const prev = fixture();

  // model change (any details)
  const modelChange = fixture({ pricingModel: 'Usage-based' });
  let e = findActivity(computeDiff(prev, modelChange, baselineWorkflow), 'PRICING_CHANGED');
  assert('model change → detected', e !== undefined);
  assert('severity = MAJOR on model change', e?.severity === 'MAJOR');

  // minor details edit (< 30%) → no event
  const minorEdit = fixture({
    pricingDetails: 'Starter $29/mo, Pro $99/mo, Enterprise contact-us.',
  });
  e = findActivity(computeDiff(prev, minorEdit, baselineWorkflow), 'PRICING_CHANGED');
  assert(
    'minor details edit → no event',
    e === undefined,
    e ? `unexpected event: ${e.summary}` : '',
  );

  // significant details rewrite
  const majorEdit = fixture({
    pricingDetails: 'Free tier; teams plan from $19 user/mo; volume discounts.',
  });
  e = findActivity(computeDiff(prev, majorEdit, baselineWorkflow), 'PRICING_CHANGED');
  assert('significant details rewrite → detected', e !== undefined);
  assert(
    'detailsSignificant flag set',
    e?.diffPayload.kind === 'pricing-change' && e.diffPayload.detailsSignificant === true,
  );
}

console.log('\n## Rule 4 — NEW_PRODUCT');
{
  const prev = fixture();
  const next = fixture({ mainOfferings: [...prev.mainOfferings, 'Brand voice'] });
  const events = computeDiff(prev, next, baselineWorkflow);
  const e = findActivity(events, 'NEW_PRODUCT');
  assert('detected on add', e !== undefined);
  assert(
    'added contains new item (case-preserved)',
    e?.diffPayload.kind === 'list-change' &&
      e.diffPayload.added.includes('Brand voice'),
  );
  assert(
    'no PRODUCT_REMOVED on pure-add',
    findActivity(events, 'PRODUCT_REMOVED') === undefined,
  );

  // Case-only re-cast → set-membership is case-insensitive.
  const recased = fixture({ mainOfferings: ['BRAND STRATEGY', 'content generation'] });
  const noEvents = computeDiff(prev, recased, baselineWorkflow);
  assert(
    'case-only re-cast → no NEW_PRODUCT',
    findActivity(noEvents, 'NEW_PRODUCT') === undefined,
  );
  assert(
    'case-only re-cast → no PRODUCT_REMOVED',
    findActivity(noEvents, 'PRODUCT_REMOVED') === undefined,
  );
}

console.log('\n## Rule 5 — PRODUCT_REMOVED');
{
  const prev = fixture();
  const next = fixture({ mainOfferings: ['Brand strategy'] });
  const events = computeDiff(prev, next, baselineWorkflow);
  const e = findActivity(events, 'PRODUCT_REMOVED');
  assert('detected on remove', e !== undefined);
  assert(
    'removed contains gone item (case-preserved)',
    e?.diffPayload.kind === 'list-change' &&
      e.diffPayload.removed.includes('Content generation'),
  );
}

console.log('\n## Case-sensitive content events (W.3 fix)');
{
  // Hash + diff trekken nu in lockstep op: case-only edit triggert
  // zowel een hash-flip als een diff-event. Geen orphan snapshots.
  const prev = fixture();
  const next = fixture({ tagline: 'THE MODERN BRAND PLATFORM' });
  const events = computeDiff(prev, next, baselineWorkflow);
  assert('case-only tagline edit → TAGLINE_CHANGED', findActivity(events, 'TAGLINE_CHANGED') !== undefined);
}

console.log('\n## Rule 6 — STATUS_CHANGED');
{
  const events = computeDiff(fixture(), fixture(), {
    workflowBefore: { status: 'DRAFT', tier: 'DIRECT' },
    workflowAfter: { status: 'ANALYZED', tier: 'DIRECT' },
  });
  const e = findActivity(events, 'STATUS_CHANGED');
  assert('detected on status transition', e !== undefined);
  assert('severity = INFO', e?.severity === 'INFO');
  assert('detectionMethod = manual', e?.detectionMethod === 'manual');
  assert(
    'before=DRAFT after=ANALYZED',
    e?.diffPayload.kind === 'workflow-change' &&
      e.diffPayload.before === 'DRAFT' &&
      e.diffPayload.after === 'ANALYZED',
  );
}

console.log('\n## Rule 7 — TIER_CHANGED');
{
  const events = computeDiff(fixture(), fixture(), {
    workflowBefore: { status: 'ANALYZED', tier: 'DIRECT' },
    workflowAfter: { status: 'ANALYZED', tier: 'INDIRECT' },
  });
  const e = findActivity(events, 'TIER_CHANGED');
  assert('detected on tier transition', e !== undefined);
  assert('severity = INFO', e?.severity === 'INFO');
}

// =============================================================
// LAYER 3: No-op detection
// =============================================================
console.log('\n=== LAYER 3: no-op + edge cases ===\n');

console.log('## prev = null (first snapshot)');
{
  const events = computeDiff(null, fixture(), {
    workflowBefore: null,
    workflowAfter: { status: 'ANALYZED', tier: 'DIRECT' },
  });
  assert('no content events when prev is null', events.length === 0);
}

console.log('\n## identical states');
{
  const events = computeDiff(fixture(), fixture(), baselineWorkflow);
  assert('0 events on identical state', events.length === 0);
}

console.log('\n## combined: tagline + status changed in one refresh');
{
  const events = computeDiff(
    fixture(),
    fixture({ tagline: 'A new positioning' }),
    {
      workflowBefore: { status: 'DRAFT', tier: 'DIRECT' },
      workflowAfter: { status: 'ANALYZED', tier: 'DIRECT' },
    },
  );
  assert('TAGLINE_CHANGED + STATUS_CHANGED both present', events.length === 2);
  assert('contains TAGLINE_CHANGED', findActivity(events, 'TAGLINE_CHANGED') !== undefined);
  assert('contains STATUS_CHANGED', findActivity(events, 'STATUS_CHANGED') !== undefined);
}

// =============================================================
console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
process.exit(fail > 0 ? 1 : 0);
