// =============================================================
// Auto-iterate orchestrator — sub-sprint #6.B + UX-overhaul 2026-05-13.
// Wraps F-VAL scoring met feedback-driven regeneration.
// Stop-conditions:
//   - composite ≥ per-type threshold (success)
//   - max-iterations reached (escalate to user)
//   - early-stop: 2 opeenvolgende iteraties geen verbetering (< 2 pt delta)
//   - regenerate-call faalt (abort, present last variant)
//
// Pure module — alle external dependencies via DI-interfaces zodat
// smoke-tests geen DB/AI hoeven aan te raken.
// =============================================================

import { compileFeedbackHint } from '@/lib/content-test/feedback-compiler';
import type {
  FeedbackCompilerFinding,
  FeedbackCompilerOutput,
} from '@/lib/content-test/feedback-compiler';

// UX-overhaul 2026-05-13: max iteraties van 2 → 5; combineer met early-stop
// (2 opeenvolgende iters zonder verbetering) zodat we gemiddeld 3 doen maar
// in moeilijke gevallen tot 5 kunnen klauteren. Cost-cap: ~$0.25/run worst case.
const DEFAULT_MAX_ITERATIONS = 5;
const EARLY_STOP_DELTA_THRESHOLD = 2; // < 2 pt verbetering = stagnatie-signaal
const EARLY_STOP_STAGNATION_COUNT = 2; // 2 opeenvolgende stagnatie-iters = stop

export interface AutoIterateEvent {
  event:
    | 'auto_iterate_started'
    | 'auto_iterate_iteration_started'
    | 'auto_iterate_iteration_complete'
    | 'auto_iterate_complete'
    | 'auto_iterate_skipped';
  data: Record<string, unknown>;
}

export interface AutoIterateInput {
  /** Initial F-VAL score; trigger voor iteratie wanneer < threshold. */
  initialScore: { compositeScore: number; scoreId: string };
  /** Per-type fidelity threshold (0-100). */
  threshold: number;
  /** Pijler-scores voor feedback-compiler emphasis. */
  pillarScores?: { style?: number; judge?: number; rules?: number };
  /** Findings (BrandReviewFinding rows) gekoppeld aan initial score. */
  findings: FeedbackCompilerFinding[];
  /** Initial generated text per component (voor regenerate baseline). */
  initialText: string;
  /** Workspace + deliverable identifiers voor LearningEvent + retries. */
  workspaceId: string;
  deliverableId: string;
  /** Feature-flag check; user kan via Settings opt-out. */
  enabled: boolean;
  /** Override default (2). */
  maxIterations?: number;
  /** DI: regenerate-functie. Krijgt prompt-hint, return nieuwe content. */
  regenerate: RegenerateFn;
  /** DI: re-score-functie. Krijgt nieuwe content, return nieuwe score+findings. */
  rescore: RescoreFn;
  /** DI: cost-tracker hook (LearningEvent stub). */
  onIteration?: (data: IterationLog) => Promise<void>;
}

export interface IterationLog {
  workspaceId: string;
  deliverableId: string;
  iteration: number;
  previousScore: number;
  newScore: number;
  appliedTemplates: string[];
  unmappedFindingsCount: number;
  durationMs: number;
}

export type RegenerateFn = (input: {
  baselineText: string;
  promptHint: string;
  attemptNumber: number;
}) => Promise<{ text: string }>;

export type RescoreFn = (input: {
  text: string;
}) => Promise<{
  compositeScore: number;
  scoreId: string;
  findings: FeedbackCompilerFinding[];
  pillarScores?: { style?: number; judge?: number; rules?: number };
}>;

export interface AutoIterateResult {
  /** Aantal attempts uitgevoerd (0 = skipped, 1-2 = iterated). */
  attemptsExecuted: number;
  /** Final score (kan nog steeds onder threshold zijn na max-iterations). */
  finalScore: number;
  /** Final content (best-of na iteraties). */
  finalText: string;
  /** True wanneer threshold uiteindelijk gehaald is. */
  thresholdMet: boolean;
  /** Reason waarom orchestrator stopte. */
  stopReason: 'threshold_met' | 'max_iterations' | 'early_stop_stagnation' | 'regenerate_failed' | 'disabled' | 'already_passing';
  /** Per-iteration log voor learning-loop attribution. */
  iterations: IterationLog[];
}

/**
 * Auto-iterate orchestrator. Async generator emit SSE-style events
 * voor canvas UI. Pure logic — geen DB/AI direct, alleen via DI.
 */
export async function* runAutoIterate(
  input: AutoIterateInput,
): AsyncGenerator<AutoIterateEvent, AutoIterateResult> {
  const maxIterations = input.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const iterations: IterationLog[] = [];

  // ── Early-exit: feature disabled ──
  if (!input.enabled) {
    yield {
      event: 'auto_iterate_skipped',
      data: { reason: 'disabled', initialScore: input.initialScore.compositeScore },
    };
    return {
      attemptsExecuted: 0,
      finalScore: input.initialScore.compositeScore,
      finalText: input.initialText,
      thresholdMet: input.initialScore.compositeScore >= input.threshold,
      stopReason: 'disabled',
      iterations,
    };
  }

  // ── Early-exit: already above threshold ──
  if (input.initialScore.compositeScore >= input.threshold) {
    yield {
      event: 'auto_iterate_skipped',
      data: {
        reason: 'already_passing',
        initialScore: input.initialScore.compositeScore,
        threshold: input.threshold,
      },
    };
    return {
      attemptsExecuted: 0,
      finalScore: input.initialScore.compositeScore,
      finalText: input.initialText,
      thresholdMet: true,
      stopReason: 'already_passing',
      iterations,
    };
  }

  yield {
    event: 'auto_iterate_started',
    data: {
      initialScore: input.initialScore.compositeScore,
      threshold: input.threshold,
      maxIterations,
      findingsCount: input.findings.length,
    },
  };

  // ── Iteration loop ──
  let currentText = input.initialText;
  let currentScore = input.initialScore.compositeScore;
  let currentFindings = input.findings;
  let currentPillarScores = input.pillarScores;
  let bestText = input.initialText;
  let bestScore = currentScore;
  // Early-stop tracking: tel hoeveel opeenvolgende iteraties stagneerden
  // (< EARLY_STOP_DELTA_THRESHOLD verbetering). Bij EARLY_STOP_STAGNATION_COUNT
  // = stop met reden 'early_stop_stagnation'.
  let stagnationCount = 0;

  for (let attempt = 1; attempt <= maxIterations; attempt++) {
    const iterationStart = Date.now();
    const previousScore = currentScore;

    // 1. Compile feedback-hint uit huidige findings
    const compiled: FeedbackCompilerOutput = compileFeedbackHint({
      findings: currentFindings,
      pillarScores: currentPillarScores,
      attemptNumber: attempt,
      compositeScore: currentScore,
    });

    yield {
      event: 'auto_iterate_iteration_started',
      data: {
        attempt,
        previousScore,
        appliedTemplates: compiled.appliedTemplates,
        unmappedFindingsCount: compiled.unmappedFindingsCount,
      },
    };

    // 2. Regenerate via DI
    let regeneratedText: string;
    try {
      const result = await input.regenerate({
        baselineText: currentText,
        promptHint: compiled.promptHint,
        attemptNumber: attempt,
      });
      regeneratedText = result.text;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown regenerate error';
      yield {
        event: 'auto_iterate_complete',
        data: {
          attemptsExecuted: attempt - 1,
          finalScore: bestScore,
          thresholdMet: bestScore >= input.threshold,
          stopReason: 'regenerate_failed',
          error: errMsg,
        },
      };
      return {
        attemptsExecuted: attempt - 1,
        finalScore: bestScore,
        finalText: bestText,
        thresholdMet: bestScore >= input.threshold,
        stopReason: 'regenerate_failed',
        iterations,
      };
    }

    // 3. Re-score via DI
    const rescoreResult = await input.rescore({ text: regeneratedText });
    currentText = regeneratedText;
    currentScore = rescoreResult.compositeScore;
    currentFindings = rescoreResult.findings;
    currentPillarScores = rescoreResult.pillarScores;

    // 4. Track best-of (auto-iterate-2 kan score VERLAGEN; bewaar beste)
    if (currentScore > bestScore) {
      bestScore = currentScore;
      bestText = currentText;
    }

    const durationMs = Date.now() - iterationStart;
    const log: IterationLog = {
      workspaceId: input.workspaceId,
      deliverableId: input.deliverableId,
      iteration: attempt,
      previousScore,
      newScore: currentScore,
      appliedTemplates: compiled.appliedTemplates,
      unmappedFindingsCount: compiled.unmappedFindingsCount,
      durationMs,
    };
    iterations.push(log);
    if (input.onIteration) {
      try {
        await input.onIteration(log);
      } catch (err) {
        console.warn(
          '[auto-iterate] onIteration hook failed:',
          err instanceof Error ? err.message : err,
        );
      }
    }

    yield {
      event: 'auto_iterate_iteration_complete',
      data: {
        attempt,
        previousScore,
        newScore: currentScore,
        delta: Math.round((currentScore - previousScore) * 10) / 10,
        durationMs,
      },
    };

    // 5. Stop wanneer threshold gehaald
    if (currentScore >= input.threshold) {
      yield {
        event: 'auto_iterate_complete',
        data: {
          attemptsExecuted: attempt,
          finalScore: bestScore,
          thresholdMet: true,
          stopReason: 'threshold_met',
        },
      };
      return {
        attemptsExecuted: attempt,
        finalScore: bestScore,
        finalText: bestText,
        thresholdMet: true,
        stopReason: 'threshold_met',
        iterations,
      };
    }

    // 6. Early-stop bij stagnatie — voorkomt geld verbranden aan iteraties
    // die niet meer significante winst opleveren. Telt opeenvolgende iters
    // met delta < EARLY_STOP_DELTA_THRESHOLD; bij 2× achter elkaar = stop.
    const delta = currentScore - previousScore;
    if (delta < EARLY_STOP_DELTA_THRESHOLD) {
      stagnationCount++;
      if (stagnationCount >= EARLY_STOP_STAGNATION_COUNT) {
        yield {
          event: 'auto_iterate_complete',
          data: {
            attemptsExecuted: attempt,
            finalScore: bestScore,
            thresholdMet: bestScore >= input.threshold,
            stopReason: 'early_stop_stagnation',
          },
        };
        return {
          attemptsExecuted: attempt,
          finalScore: bestScore,
          finalText: bestText,
          thresholdMet: bestScore >= input.threshold,
          stopReason: 'early_stop_stagnation',
          iterations,
        };
      }
    } else {
      stagnationCount = 0; // reset wanneer een iteratie wel winst gaf
    }
  }

  // ── Max iterations reached zonder threshold ──
  yield {
    event: 'auto_iterate_complete',
    data: {
      attemptsExecuted: maxIterations,
      finalScore: bestScore,
      thresholdMet: bestScore >= input.threshold,
      stopReason: 'max_iterations',
    },
  };

  return {
    attemptsExecuted: maxIterations,
    finalScore: bestScore,
    finalText: bestText,
    thresholdMet: bestScore >= input.threshold,
    stopReason: 'max_iterations',
    iterations,
  };
}
