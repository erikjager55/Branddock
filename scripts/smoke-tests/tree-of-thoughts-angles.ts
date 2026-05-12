/**
 * Smoke-test voor Tree-of-Thoughts angle-generator.
 * Sub-sprint #5.B chain-pattern E foundation.
 *
 * Test-strategie: mock-AI met fixture-data om pipeline-mechanica te
 * verifieren (Generate -> Evaluate -> Select). Geen API-cost.
 *
 * Run: DATABASE_URL=... npx tsx scripts/smoke-tests/tree-of-thoughts-angles.ts
 */
import {
  generateCreativeAnglesToT,
  selectTopTwoWithFramingDiversity,
  type AICompletionFn,
  type AngleEvaluation,
  type ToTAnglesConfig,
} from '../../src/lib/ai/chains/tree-of-thoughts-angles';
import type { CanvasContextStack } from '../../src/lib/ai/canvas-context';

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

// ─── Fixtures ─────────────────────────────────────────────────

const STACK: Partial<CanvasContextStack> = {
  brand: {
    brandName: 'LINFI',
    brandPersonality: 'Vakkundig + exclusief + perfectionistisch',
    contentLanguage: 'nl',
  } as CanvasContextStack['brand'],
  brief: {
    objective: 'Premium-segment huiseigenaren bereiken',
    keyMessage: 'Vakmanschap zonder compromis',
    toneDirection: 'vakkundig, exclusief, perfectionistisch',
    callToAction: 'Plan een showroom-bezoek',
  } as CanvasContextStack['brief'],
  personas: [{ name: 'Premium-huiseigenaar' }] as CanvasContextStack['personas'],
};

const FIXTURE_CANDIDATES = [
  { label: 'Hectares & cijfers', approach: 'Open met cijfers over LINFI productie + marktimpact.', framingType: 'stat-driven' },
  { label: 'Hand & materiaal', approach: 'Sensorial: textuur van hout, geluid van schuurpapier.', framingType: 'sensorial' },
  { label: 'Klant-doorbraak', approach: 'Story: een specifieke klant, doorbraakmoment in show-room.', framingType: 'story-driven' },
  { label: 'Tegen het systeem', approach: 'Provocation: waarom standaard-vloeren nooit werken.', framingType: 'provocation' },
];

const FIXTURE_EVALUATIONS = [
  { angleIndex: 0, diversityScore: 4, briefFitScore: 3, brandVoiceScore: 3, totalScore: 3.33, rationale: 'Stat-driven werkt voor B2B maar mist exclusivity-toon.' },
  { angleIndex: 1, diversityScore: 5, briefFitScore: 5, brandVoiceScore: 5, totalScore: 5.0, rationale: 'Sensorial matches vakmanschap-essentie perfect.' },
  { angleIndex: 2, diversityScore: 4, briefFitScore: 4, brandVoiceScore: 4, totalScore: 4.0, rationale: 'Story-driven werkt maar minder distinctief dan sensorial.' },
  { angleIndex: 3, diversityScore: 4, briefFitScore: 2, brandVoiceScore: 3, totalScore: 3.0, rationale: 'Provocation past niet bij LINFI exclusive-toon.' },
];

function isGenerateStage(systemPrompt: string): boolean {
  return systemPrompt.includes('4-5 fundamenteel verschillende creative angles');
}

function isEvaluateStage(systemPrompt: string): boolean {
  return systemPrompt.includes('evalueert 4-5 creative angles');
}

const mockAICompletion: AICompletionFn = async <T>(
  _provider: string,
  _model: string,
  systemPrompt: string,
): Promise<T> => {
  await new Promise((resolve) => setTimeout(resolve, 1));
  if (isGenerateStage(systemPrompt)) {
    return { angles: FIXTURE_CANDIDATES } as unknown as T;
  }
  if (isEvaluateStage(systemPrompt)) {
    return { evaluations: FIXTURE_EVALUATIONS } as unknown as T;
  }
  throw new Error(`Unmocked prompt: ${systemPrompt.slice(0, 60)}`);
};

const mockGenerateFails: AICompletionFn = async <T>(
  _p: string,
  _m: string,
  systemPrompt: string,
): Promise<T> => {
  if (isGenerateStage(systemPrompt)) {
    throw new Error('Simulated generate failure');
  }
  return {} as T;
};

const mockEvaluateFails: AICompletionFn = async <T>(
  _p: string,
  _m: string,
  systemPrompt: string,
): Promise<T> => {
  if (isGenerateStage(systemPrompt)) return { angles: FIXTURE_CANDIDATES } as unknown as T;
  if (isEvaluateStage(systemPrompt)) {
    throw new Error('Simulated evaluate failure');
  }
  throw new Error('Unmocked');
};

const mockOnlyTwoCandidates: AICompletionFn = async <T>(
  _p: string,
  _m: string,
  systemPrompt: string,
): Promise<T> => {
  if (isGenerateStage(systemPrompt)) {
    return { angles: FIXTURE_CANDIDATES.slice(0, 2) } as unknown as T;
  }
  if (isEvaluateStage(systemPrompt)) {
    return {
      evaluations: FIXTURE_EVALUATIONS.slice(0, 2),
    } as unknown as T;
  }
  throw new Error('Unmocked');
};

const mockAllSameFraming: AICompletionFn = async <T>(
  _p: string,
  _m: string,
  systemPrompt: string,
): Promise<T> => {
  if (isGenerateStage(systemPrompt)) {
    return {
      angles: FIXTURE_CANDIDATES.map((c) => ({ ...c, framingType: 'stat-driven' })),
    } as unknown as T;
  }
  if (isEvaluateStage(systemPrompt)) {
    return { evaluations: FIXTURE_EVALUATIONS } as unknown as T;
  }
  throw new Error('Unmocked');
};

// ─── Tests ────────────────────────────────────────────────────

async function main() {
  console.log('\n=== Tree-of-Thoughts angle-generator smoke ===\n');

  // ─ Test 1: happy path ─
  console.log('## Test 1: Happy path — 4 candidates → top-2 selection\n');
  const result = await generateCreativeAnglesToT(
    STACK as CanvasContextStack,
    'blog-post',
    { aiCompletion: mockAICompletion } as ToTAnglesConfig,
  );
  assert('returns ToTAnglesResult (not null)', result !== null);
  assert(
    'selectedAngles has exactly 2',
    result?.selectedAngles.length === 2,
    `got ${result?.selectedAngles.length}`,
  );
  assert(
    'allEvaluated has 4 candidates',
    result?.allEvaluated.length === 4,
    `got ${result?.allEvaluated.length}`,
  );
  assert(
    'top-1 = highest-score candidate (sensorial=5.0)',
    result?.selectedAngles[0].label === 'Hand & materiaal',
    `got ${result?.selectedAngles[0].label}`,
  );

  // ─ Test 2: framing-diversity constraint ─
  console.log('\n## Test 2: Framing-diversity constraint\n');
  // Top-1 = sensorial (5.0). Top-2 moet NIET sensorial zijn.
  // Resterende sorted: story (4.0), stat (3.33), provoc (3.0).
  // Top-2 = story-driven (4.0).
  assert(
    'top-2 = story-driven (verschillend framingType van sensorial)',
    result?.selectedAngles[1].label === 'Klant-doorbraak',
    `got ${result?.selectedAngles[1].label}`,
  );

  // ─ Test 3: metrics populated ─
  console.log('\n## Test 3: Metrics tracking\n');
  assert('generateLatencyMs > 0', (result?.metrics.generateLatencyMs ?? 0) >= 0);
  assert('evaluateLatencyMs > 0', (result?.metrics.evaluateLatencyMs ?? 0) >= 0);
  assert('candidateCount = 4', result?.metrics.candidateCount === 4);

  // ─ Test 4: scores clamped to 1-5 ─
  console.log('\n## Test 4: Score-clamping (1-5)\n');
  assert(
    'all diversity scores in [1,5]',
    result!.allEvaluated.every((e) => e.diversityScore >= 1 && e.diversityScore <= 5),
  );
  assert(
    'all briefFit scores in [1,5]',
    result!.allEvaluated.every((e) => e.briefFitScore >= 1 && e.briefFitScore <= 5),
  );

  // ─ Test 5: generate-stage failure ─
  console.log('\n## Test 5: Graceful failure — generate-stage fails\n');
  const failGen = await generateCreativeAnglesToT(
    STACK as CanvasContextStack,
    'blog-post',
    { aiCompletion: mockGenerateFails } as ToTAnglesConfig,
  );
  assert('returns null on generate-fail (graceful)', failGen === null);

  // ─ Test 6: evaluate-stage failure ─
  console.log('\n## Test 6: Graceful failure — evaluate-stage fails\n');
  const failEval = await generateCreativeAnglesToT(
    STACK as CanvasContextStack,
    'blog-post',
    { aiCompletion: mockEvaluateFails } as ToTAnglesConfig,
  );
  assert('returns null on evaluate-fail (graceful)', failEval === null);

  // ─ Test 7: only 2 candidates (minimum) ─
  console.log('\n## Test 7: Minimum viable — 2 candidates returned\n');
  const minimal = await generateCreativeAnglesToT(
    STACK as CanvasContextStack,
    'blog-post',
    { aiCompletion: mockOnlyTwoCandidates } as ToTAnglesConfig,
  );
  assert('returns result with 2 candidates', minimal !== null && minimal.allEvaluated.length === 2);
  assert(
    'selectedAngles = 2',
    minimal?.selectedAngles.length === 2,
    `got ${minimal?.selectedAngles.length}`,
  );

  // ─ Test 8: degenerate case — all same framing ─
  console.log('\n## Test 8: Degenerate case — all same framingType\n');
  const samFram = await generateCreativeAnglesToT(
    STACK as CanvasContextStack,
    'blog-post',
    { aiCompletion: mockAllSameFraming } as ToTAnglesConfig,
  );
  assert('returns result (fallback to score-only)', samFram !== null);
  assert(
    'selectedAngles = 2 (fallback to top-2 by score)',
    samFram?.selectedAngles.length === 2,
  );

  // ─ Test 9: selectTopTwoWithFramingDiversity isolated ─
  console.log('\n## Test 9: Selection-function direct test\n');
  const emptyEval: AngleEvaluation[] = [];
  assert('empty input → empty output', selectTopTwoWithFramingDiversity(emptyEval).length === 0);

  const singleEval: AngleEvaluation[] = [{
    angle: { label: 'Solo', approach: 'Only one.' },
    diversityScore: 3,
    briefFitScore: 3,
    brandVoiceScore: 3,
    totalScore: 3,
    rationale: 'Just one.',
    framingType: 'story-driven',
  }];
  assert(
    '1-item input → 1-item output',
    selectTopTwoWithFramingDiversity(singleEval).length === 1,
  );

  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
