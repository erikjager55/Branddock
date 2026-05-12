/**
 * Smoke-test voor auto-iterate orchestrator (sub-sprint #6.B).
 *
 * Verifies: skip-paths (disabled / already-passing), success-flow
 * (threshold gehaald op iteration 1 of 2), max-iterations-exhaust,
 * regenerate-failure-recovery, best-of tracking (score-drop in attempt 2).
 *
 * Mock-DI: regenerate + rescore + onIteration. Geen DB/AI nodig.
 *
 * Run: npx tsx scripts/smoke-tests/auto-iterate.ts
 */

import {
  runAutoIterate,
  type AutoIterateInput,
  type AutoIterateEvent,
} from '../../src/lib/ai/auto-iterate';

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

async function drain(
  gen: AsyncGenerator<AutoIterateEvent, ReturnType<typeof Object>>,
): Promise<{
  events: AutoIterateEvent[];
  result: Awaited<ReturnType<typeof Object>>;
}> {
  const events: AutoIterateEvent[] = [];
  let result: unknown;
  while (true) {
    const { value, done } = await gen.next();
    if (done) {
      result = value;
      break;
    }
    events.push(value);
  }
  return { events, result };
}

const baseFindings = [
  { category: 'VOICE' as const, severity: 'HIGH' as const, description: 'Toon is te formal' },
];

const baseInput: Omit<AutoIterateInput, 'enabled' | 'initialScore' | 'regenerate' | 'rescore'> = {
  threshold: 65,
  findings: baseFindings,
  initialText: 'Original AI-generated content over de service.',
  workspaceId: 'ws_test',
  deliverableId: 'del_test',
};

async function main() {
  console.log('\n=== Auto-iterate smoke ===\n');

  // ─── Skip: feature disabled ─────────────────────────────────
  console.log('## Skip-paths\n');

  const disabled = await drain(
    runAutoIterate({
      ...baseInput,
      enabled: false,
      initialScore: { compositeScore: 50, scoreId: 'sc_1' },
      regenerate: async () => ({ text: 'should-not-be-called' }),
      rescore: async () => ({ compositeScore: 0, scoreId: '', findings: [] }),
    }),
  );
  assert(
    'disabled → skipped event + stopReason=disabled',
    disabled.events.some((e) => e.event === 'auto_iterate_skipped') &&
      (disabled.result as { stopReason: string }).stopReason === 'disabled',
  );

  const alreadyPassing = await drain(
    runAutoIterate({
      ...baseInput,
      enabled: true,
      initialScore: { compositeScore: 80, scoreId: 'sc_2' },
      regenerate: async () => ({ text: 'should-not-be-called' }),
      rescore: async () => ({ compositeScore: 0, scoreId: '', findings: [] }),
    }),
  );
  assert(
    'already-passing → skipped + thresholdMet=true',
    (alreadyPassing.result as { thresholdMet: boolean }).thresholdMet === true,
  );

  // ─── Success: threshold gehaald op iteration 1 ──────────────
  console.log('\n## Success-flow\n');

  let regenCalls = 0;
  const success1 = await drain(
    runAutoIterate({
      ...baseInput,
      enabled: true,
      initialScore: { compositeScore: 50, scoreId: 'sc_3' },
      regenerate: async () => {
        regenCalls++;
        return { text: 'Improved variant with concrete details and brand-fit toon.' };
      },
      rescore: async () => ({
        compositeScore: 72,
        scoreId: 'sc_iter_1',
        findings: [],
      }),
    }),
  );
  assert('1 iteration → 1 regen-call', regenCalls === 1);
  assert(
    'success: threshold_met op iter 1',
    (success1.result as { stopReason: string }).stopReason === 'threshold_met',
  );
  assert(
    'success: attemptsExecuted = 1',
    (success1.result as { attemptsExecuted: number }).attemptsExecuted === 1,
  );
  assert(
    'success: finalScore >= threshold',
    (success1.result as { finalScore: number }).finalScore >= 65,
  );

  // ─── Threshold gehaald op iteration 2 ───────────────────────
  let iter = 0;
  const success2 = await drain(
    runAutoIterate({
      ...baseInput,
      enabled: true,
      initialScore: { compositeScore: 50, scoreId: 'sc_4' },
      regenerate: async () => ({ text: `iter_${++iter}_text` }),
      rescore: async ({ text }) => {
        // iter 1 = 58 (still below 65), iter 2 = 70 (above)
        const score = text.includes('iter_1') ? 58 : 70;
        return { compositeScore: score, scoreId: 'sc_iter', findings: baseFindings };
      },
    }),
  );
  assert(
    'success op iter 2: attemptsExecuted = 2',
    (success2.result as { attemptsExecuted: number }).attemptsExecuted === 2,
  );
  assert(
    'success op iter 2: thresholdMet = true',
    (success2.result as { thresholdMet: boolean }).thresholdMet === true,
  );

  // ─── Max-iterations exhausted ───────────────────────────────
  console.log('\n## Max-iterations\n');

  const exhausted = await drain(
    runAutoIterate({
      ...baseInput,
      enabled: true,
      initialScore: { compositeScore: 50, scoreId: 'sc_5' },
      regenerate: async () => ({ text: 'still-bad' }),
      rescore: async () => ({ compositeScore: 55, scoreId: 'sc_iter', findings: baseFindings }),
    }),
  );
  assert(
    'exhausted: stopReason = max_iterations',
    (exhausted.result as { stopReason: string }).stopReason === 'max_iterations',
  );
  assert(
    'exhausted: attemptsExecuted = 2',
    (exhausted.result as { attemptsExecuted: number }).attemptsExecuted === 2,
  );
  assert(
    'exhausted: thresholdMet = false',
    (exhausted.result as { thresholdMet: boolean }).thresholdMet === false,
  );

  // ─── Regenerate-failure recovery ────────────────────────────
  console.log('\n## Regenerate-failure\n');

  const failed = await drain(
    runAutoIterate({
      ...baseInput,
      enabled: true,
      initialScore: { compositeScore: 50, scoreId: 'sc_6' },
      regenerate: async () => {
        throw new Error('AI provider down');
      },
      rescore: async () => ({ compositeScore: 0, scoreId: '', findings: [] }),
    }),
  );
  assert(
    'regen-fail: stopReason = regenerate_failed',
    (failed.result as { stopReason: string }).stopReason === 'regenerate_failed',
  );
  assert(
    'regen-fail: finalText = initial (no regression)',
    (failed.result as { finalText: string }).finalText === baseInput.initialText,
  );

  // ─── Best-of tracking: score-drop in iter 2 ─────────────────
  console.log('\n## Best-of tracking\n');

  let dropIter = 0;
  const dropping = await drain(
    runAutoIterate({
      ...baseInput,
      enabled: true,
      initialScore: { compositeScore: 50, scoreId: 'sc_7' },
      regenerate: async () => ({ text: `drop_${++dropIter}` }),
      rescore: async ({ text }) => {
        // iter 1 = 60, iter 2 = 55 (DROP, but neither passes 65)
        const score = text.includes('drop_1') ? 60 : 55;
        return { compositeScore: score, scoreId: 'sc_iter', findings: baseFindings };
      },
    }),
  );
  assert(
    'best-of: finalScore = 60 (iter 1 hoogste)',
    (dropping.result as { finalScore: number }).finalScore === 60,
  );
  assert(
    'best-of: finalText = drop_1 (not drop_2)',
    (dropping.result as { finalText: string }).finalText === 'drop_1',
  );

  // ─── onIteration hook ───────────────────────────────────────
  console.log('\n## onIteration hook\n');

  const hookCalls: number[] = [];
  await drain(
    runAutoIterate({
      ...baseInput,
      enabled: true,
      initialScore: { compositeScore: 50, scoreId: 'sc_8' },
      regenerate: async () => ({ text: 'whatever' }),
      rescore: async () => ({ compositeScore: 70, scoreId: '', findings: [] }),
      onIteration: async (log) => {
        hookCalls.push(log.iteration);
      },
    }),
  );
  assert('onIteration called for iter 1', hookCalls.length === 1 && hookCalls[0] === 1);

  // ─── Event-emission sanity ──────────────────────────────────
  console.log('\n## Event-emission\n');

  const eventCheck = await drain(
    runAutoIterate({
      ...baseInput,
      enabled: true,
      initialScore: { compositeScore: 50, scoreId: 'sc_9' },
      regenerate: async () => ({ text: 'better' }),
      rescore: async () => ({ compositeScore: 72, scoreId: '', findings: [] }),
    }),
  );
  const eventNames = eventCheck.events.map((e) => e.event);
  assert(
    'events include started + iteration_started + iteration_complete + complete',
    eventNames.includes('auto_iterate_started') &&
      eventNames.includes('auto_iterate_iteration_started') &&
      eventNames.includes('auto_iterate_iteration_complete') &&
      eventNames.includes('auto_iterate_complete'),
  );

  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
