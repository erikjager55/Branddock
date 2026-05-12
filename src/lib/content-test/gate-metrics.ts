// =============================================================
// Checkpoint-gate metrics + degradation-alert (sub-sprint #6.A).
//
// Emit PostHog-events voor pipeline-gate health:
//   - `content_test.gate_run` per orchestrator-run (pass/warn counts).
//   - `content_test.gate_degradation` wanneer rolling-window pass-rate
//     onder threshold zakt (default 95%).
//
// Beide functies zijn fire-and-forget; tracking-failures mogen content-
// generatie niet blokkeren. Lookback-query gebruikt AICallTrace.gateWarnings
// (gepersisteerd in 6.A wiring 4/4).
// =============================================================

import { trackEvent } from '@/lib/analytics/posthog';
import { prisma } from '@/lib/prisma';
import type { GateResult } from './checkpoint-gates';

const DEFAULT_LOOKBACK_COUNT = 20;
const DEFAULT_PASS_RATE_THRESHOLD = 95;
const TOTAL_GATES_PER_RUN = 8;

interface GateRunMetricsInput {
  workspaceId: string;
  deliverableId: string;
  gateWarnings: GateResult[];
}

/**
 * Emit per-orchestrator-run gate-metrics naar PostHog. Block-severity
 * gates bereiken deze functie niet (pipeline al gefaald via SSE error),
 * dus block_failures is altijd 0 als deze functie wordt aangeroepen.
 */
export async function emitGateRunMetrics(input: GateRunMetricsInput): Promise<void> {
  const warnCount = input.gateWarnings.length;
  const passRate = Math.round(((TOTAL_GATES_PER_RUN - warnCount) / TOTAL_GATES_PER_RUN) * 100);
  const stagesWarned = input.gateWarnings.map((g) => g.stage);

  await trackEvent({
    event: 'content_test.gate_run',
    workspaceId: input.workspaceId,
    properties: {
      deliverable_id: input.deliverableId,
      total_gates_evaluated: TOTAL_GATES_PER_RUN,
      block_failures: 0,
      warn_failures: warnCount,
      stages_warned: stagesWarned,
      pass_rate: passRate,
    },
  });
}

interface DegradationCheckInput {
  workspaceId: string;
  /** Rolling window grootte. Default 20. */
  lookbackCount?: number;
  /** Pass-rate-grens (0-100). Default 95. */
  threshold?: number;
}

interface DegradationCheckResult {
  degraded: boolean;
  recentRunsCount: number;
  recentPassRate: number;
  worstStage: string | null;
}

/**
 * Query recent AICallTraces voor deze workspace, bereken pass-rate over
 * laatste N runs. Emit `content_test.gate_degradation` event wanneer
 * pass-rate onder threshold zakt. Return resultaat voor optionele logging.
 */
export async function checkGateDegradation(
  input: DegradationCheckInput,
): Promise<DegradationCheckResult> {
  const lookbackCount = input.lookbackCount ?? DEFAULT_LOOKBACK_COUNT;
  const threshold = input.threshold ?? DEFAULT_PASS_RATE_THRESHOLD;

  const recentTraces = await prisma.aICallTrace.findMany({
    where: {
      workspaceId: input.workspaceId,
      parentEntityType: 'Deliverable',
      gateWarnings: { not: { equals: null as never } },
    },
    orderBy: { startedAt: 'desc' },
    take: lookbackCount,
    select: { gateWarnings: true },
  });

  if (recentTraces.length === 0) {
    return { degraded: false, recentRunsCount: 0, recentPassRate: 100, worstStage: null };
  }

  let totalWarns = 0;
  const stageWarnCounts: Record<string, number> = {};
  for (const trace of recentTraces) {
    const gw = trace.gateWarnings as { warnings?: Array<{ stage: string }> } | null;
    const warnings = gw?.warnings ?? [];
    totalWarns += warnings.length;
    for (const w of warnings) {
      stageWarnCounts[w.stage] = (stageWarnCounts[w.stage] ?? 0) + 1;
    }
  }
  const totalGates = recentTraces.length * TOTAL_GATES_PER_RUN;
  const recentPassRate = Math.round(((totalGates - totalWarns) / totalGates) * 100);

  const worstStage = Object.entries(stageWarnCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const degraded = recentPassRate < threshold;

  if (degraded) {
    await trackEvent({
      event: 'content_test.gate_degradation',
      workspaceId: input.workspaceId,
      properties: {
        recent_runs_count: recentTraces.length,
        recent_pass_rate: recentPassRate,
        threshold,
        worst_stage: worstStage,
        worst_stage_warn_count: worstStage ? stageWarnCounts[worstStage] : 0,
      },
    });
  }

  return {
    degraded,
    recentRunsCount: recentTraces.length,
    recentPassRate,
    worstStage,
  };
}
