/**
 * Smoke-test voor Phase 6.2 — F-VAL judge integration.
 *
 * Verifies the evaluatePageQualityViaFVAL adapter:
 *  - Maps FidelityRunOutcome composite → PageQualityResult.score (rounded)
 *  - Maps compositeThreshold → threshold
 *  - Maps composite >= threshold → thresholdMet
 *  - Falls back to heuristic stub when runner returns null
 *  - flattenPuckText is correctly passed as contentText to the runner
 *
 * No DB, no Anthropic — FvalRunner is mocked.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase6.2-fval.ts
 */

import {
  evaluatePageQuality,
  evaluatePageQualityViaFVAL,
  type FvalRunner,
} from '../../src/lib/landing-pages/page-quality';
import type { PuckLikeData } from '../../src/lib/landing-pages/puck-data-flatten';
import type { CanvasContextStack } from '../../src/lib/ai/canvas-context';
import type { BrandTokens } from '../../src/lib/landing-pages/brand-tokens';

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

const TOKENS: BrandTokens = {
  primaryHex: '#1FD1B2',
  secondaryHex: '#0F172A',
  accentHex: '#F59E0B',
  neutralHex: '#64748B',
  headingFont: 'sans-serif',
  bodyFont: 'sans-serif',
};

const TREE: PuckLikeData = {
  root: { props: {} },
  content: [
    {
      type: 'BrandHero',
      props: { id: 'h1', headline: 'Welcome', sub: 'Subtext goes here for the page', ctaLabel: 'Start' },
    },
    {
      type: 'BrandCTA',
      props: { id: 'c1', label: 'Trial', href: '#', personaId: '' },
    },
    {
      type: 'FAQ',
      props: { id: 'f1', items: [{ question: 'Q?', answer: 'A.' }] },
    },
  ],
};

const CTX: CanvasContextStack = {
  brand: { brandName: 'TestBrand' },
  concept: null,
  journeyPhase: null,
  medium: null,
  deliverableTypeId: 'landing-page',
  personas: [],
  brief: null,
  products: [],
  brandTokens: TOKENS,
};

function makeRunner(outcome: {
  composite: number;
  compositeThreshold: number;
  pillars: { style: number | null; judge: number | null; rules: number | null };
} | null): {
  runner: FvalRunner;
  receivedContentText: { value: string | null };
  callCount: { value: number };
} {
  const receivedContentText: { value: string | null } = { value: null };
  const callCount = { value: 0 };
  const runner: FvalRunner = async (input) => {
    callCount.value++;
    receivedContentText.value = input.contentText;
    return outcome;
  };
  return { runner, receivedContentText, callCount };
}

async function testFvalScorePath(): Promise<void> {
  group('1. evaluatePageQualityViaFVAL — composite > threshold');

  const { runner, receivedContentText, callCount } = makeRunner({
    composite: 82,
    compositeThreshold: 75,
    pillars: { style: 80, judge: 85, rules: 78 },
  });

  const result = await evaluatePageQualityViaFVAL({
    data: TREE,
    ctx: CTX,
    workspaceId: 'ws-1',
    deliverableId: 'd-1',
    contentTypeId: 'landing-page',
    runFVal: runner,
  });

  assert('FvalRunner called once', callCount.value === 1);
  assert(`score = 82 (got ${result.score})`, result.score === 82);
  assert(`threshold = 75 (got ${result.threshold})`, result.threshold === 75);
  assert('thresholdMet true (82 >= 75)', result.thresholdMet === true);
  assert(
    'signals include hero/cta/proof flags',
    result.signals.hasHero && result.signals.hasCta && result.signals.hasProof,
  );
  assert(
    'contentText passed to runner contains hero copy',
    receivedContentText.value?.includes('Welcome') ?? false,
  );
  assert(
    'contentText excludes ids',
    !receivedContentText.value?.includes('"id":'),
  );
}

async function testFvalBelowThreshold(): Promise<void> {
  group('2. evaluatePageQualityViaFVAL — composite below threshold');

  const { runner } = makeRunner({
    composite: 55.4,
    compositeThreshold: 75,
    pillars: { style: 50, judge: 60, rules: 55 },
  });

  const result = await evaluatePageQualityViaFVAL({
    data: TREE,
    ctx: CTX,
    workspaceId: 'ws-1',
    deliverableId: 'd-1',
    contentTypeId: 'landing-page',
    runFVal: runner,
  });

  assert(`score rounded from 55.4 → 55 (got ${result.score})`, result.score === 55);
  assert('thresholdMet false (55 < 75)', result.thresholdMet === false);
}

async function testFvalFallback(): Promise<void> {
  group('3. evaluatePageQualityViaFVAL — runner returns null → heuristic fallback');

  const { runner, callCount } = makeRunner(null);
  const result = await evaluatePageQualityViaFVAL({
    data: TREE,
    ctx: CTX,
    workspaceId: 'ws-1',
    deliverableId: 'd-1',
    contentTypeId: 'landing-page',
    runFVal: runner,
  });

  const heuristic = evaluatePageQuality(TREE);
  assert('runner was called', callCount.value === 1);
  assert(`fallback matches heuristic score (${result.score} === ${heuristic.score})`, result.score === heuristic.score);
  assert('fallback threshold matches heuristic', result.threshold === heuristic.threshold);
  assert('fallback signals match', result.signals.hasHero === heuristic.signals.hasHero);
}

async function testFvalContentTypeId(): Promise<void> {
  group('4. evaluatePageQualityViaFVAL — contentTypeId passed through');

  const { runner } = makeRunner({
    composite: 70,
    compositeThreshold: 65,
    pillars: { style: 70, judge: 70, rules: 70 },
  });

  const captured: { contentTypeId: string | null } = { contentTypeId: 'NOT_CALLED' as never };
  const wrappedRunner: FvalRunner = async (input) => {
    captured.contentTypeId = input.contentTypeId;
    return runner(input);
  };

  await evaluatePageQualityViaFVAL({
    data: TREE,
    ctx: CTX,
    workspaceId: 'ws-1',
    deliverableId: 'd-1',
    contentTypeId: 'product-page',
    runFVal: wrappedRunner,
  });

  assert('contentTypeId forwarded to runner', captured.contentTypeId === 'product-page');
}

async function main(): Promise<void> {
  console.log('Phase 6.2 smoke-test — F-VAL judge integration');
  await testFvalScorePath();
  await testFvalBelowThreshold();
  await testFvalFallback();
  await testFvalContentTypeId();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('SMOKE crashed', err);
  process.exit(2);
});
