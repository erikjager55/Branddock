/**
 * Smoke-test voor position-swap calibration wrapper.
 * Sub-sprint #5.B anti-bias measures.
 *
 * Test-strategie: mock Anthropic.messages.create om judge-rondes te
 * simuleren zonder API-cost. Verifieer:
 *   - Position-swap mechaniek: round 1 = AB, round 2 = BA
 *   - Consistent vote (beide rondes wijzen zelfde candidate aan) → winner = A/B
 *   - Inconsistent vote (rondes disagree) → winner = 'inconsistent' + confidence 0
 *   - Label-translation: round-2 picks "first" maar dat is candidate B
 *
 * Run: ANTHROPIC_API_KEY=mock npx tsx scripts/smoke-tests/position-swap-judge.ts
 */

import { positionSwappedJudge, type JudgeClient } from '../eval/position-swap-judge';

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

interface MockCall {
  systemPrompt: string;
  userMessage: string;
}

let mockCalls: MockCall[] = [];
let mockResponses: Array<{ winner: 'first' | 'second'; rationale: string }> = [];
let client: JudgeClient;

function buildMockClient(): JudgeClient {
  mockCalls = [];
  return {
    call: async ({ system, userMessage }) => {
      mockCalls.push({ systemPrompt: system, userMessage });
      const response = mockResponses[mockCalls.length - 1];
      if (!response) throw new Error('Mock exhausted');
      return { text: JSON.stringify(response) };
    },
  };
}

async function main() {
  console.log('\n=== Position-swap judge smoke ===\n');

  // ─ Test 1: Consistent verdict — beide rondes kiezen candidate A ─
  console.log('## Test 1: Consistent verdict — both rounds pick A\n');
  client = buildMockClient();
  mockResponses = [
    // Round 1: A first, B second → judge picks "first" = A
    { winner: 'first', rationale: 'Variant 1 is clearer and more specific.' },
    // Round 2: B first, A second → judge picks "second" = A (consistent!)
    { winner: 'second', rationale: 'Variant 2 (which is A) is clearer.' },
  ];
  const result1 = await positionSwappedJudge({
    candidateA: 'Content A — clear and specific.',
    candidateB: 'Content B — vague.',
    rubric: 'Which is clearer?',
    judgeModel: 'mock',
    client,
  });
  assert('winner = A (consistent)', result1.winner === 'A');
  assert('confidence = 1.0', result1.confidence === 1.0);
  assert('2 rounds executed', mockCalls.length === 2);
  assert('round 1 order = AB', result1.rounds[0].order === 'AB');
  assert('round 2 order = BA', result1.rounds[1].order === 'BA');
  assert('round 1 picked first → candidate A', result1.rounds[0].pickedCandidate === 'A');
  assert('round 2 picked second → candidate A (label-translated)', result1.rounds[1].pickedCandidate === 'A');

  // ─ Test 2: Consistent verdict — beide rondes kiezen candidate B ─
  console.log('\n## Test 2: Consistent verdict — both rounds pick B\n');
  client = buildMockClient();
  mockResponses = [
    // Round 1: A first, B second → judge picks "second" = B
    { winner: 'second', rationale: 'Variant 2 (B) is more engaging.' },
    // Round 2: B first, A second → judge picks "first" = B (consistent!)
    { winner: 'first', rationale: 'Variant 1 (B) wins.' },
  ];
  const result2 = await positionSwappedJudge({
    candidateA: 'Boring content.',
    candidateB: 'Engaging content.',
    rubric: 'Which is more engaging?',
    judgeModel: 'mock',
    client,
  });
  assert('winner = B (consistent)', result2.winner === 'B');
  assert('confidence = 1.0', result2.confidence === 1.0);
  assert('round 1 picked second → candidate B', result2.rounds[0].pickedCandidate === 'B');
  assert('round 2 picked first → candidate B', result2.rounds[1].pickedCandidate === 'B');

  // ─ Test 3: Inconsistent — rounds disagree (position bias detected) ─
  console.log('\n## Test 3: Inconsistent — rounds disagree (bias caught)\n');
  client = buildMockClient();
  mockResponses = [
    // Round 1: A first → judge picks "first" = A
    { winner: 'first', rationale: 'Variant 1 (A) is better.' },
    // Round 2: B first → judge picks "first" = B (position bias!)
    { winner: 'first', rationale: 'Variant 1 (B) is better.' },
  ];
  const result3 = await positionSwappedJudge({
    candidateA: 'Equally good A.',
    candidateB: 'Equally good B.',
    rubric: 'Which is better?',
    judgeModel: 'mock',
    client,
  });
  assert(
    'winner = inconsistent (position bias caught)',
    result3.winner === 'inconsistent',
    `got ${result3.winner}`,
  );
  assert('confidence = 0.0', result3.confidence === 0.0);
  assert(
    'round 1 picked A, round 2 picked B (disagreement)',
    result3.rounds[0].pickedCandidate === 'A' && result3.rounds[1].pickedCandidate === 'B',
  );

  // ─ Test 4: Prompt-content verification ─
  console.log('\n## Test 4: Prompt-content verification (verify swap actually happened)\n');
  client = buildMockClient();
  mockResponses = [
    { winner: 'first', rationale: 'OK' },
    { winner: 'first', rationale: 'OK' },
  ];
  await positionSwappedJudge({
    candidateA: 'AAAA_unique',
    candidateB: 'BBBB_unique',
    rubric: 'Test',
    judgeModel: 'mock',
    client,
  });
  // Round 1: A first, B second → A's marker appears before B's in userMessage
  const round1User = mockCalls[0].userMessage;
  const aPos1 = round1User.indexOf('AAAA_unique');
  const bPos1 = round1User.indexOf('BBBB_unique');
  assert('round 1: A appears before B', aPos1 >= 0 && bPos1 >= 0 && aPos1 < bPos1);
  // Round 2: B first, A second
  const round2User = mockCalls[1].userMessage;
  const aPos2 = round2User.indexOf('AAAA_unique');
  const bPos2 = round2User.indexOf('BBBB_unique');
  assert('round 2: B appears before A (positions swapped)', bPos2 >= 0 && aPos2 >= 0 && bPos2 < aPos2);

  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
