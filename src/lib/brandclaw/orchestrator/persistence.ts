// =============================================================
// Brandclaw orchestrator — Prisma persistence helpers (ADR 2026-05-08).
//
// Schrijft AgentLoopResult naar StrategyObservationRun + N
// StrategyObservation rows in een single transaction. Atomic-eis: óf
// alle observations + run zijn opgeslagen, óf geen — voorkomt
// orphan-runs zonder observations of orphan-observations zonder run.
//
// Twee primary writes:
//  1. createRunRow(ctx, costBreakdown, toolCallTrace, latencyMs, truncated)
//     → upsert wanneer runId al bestaat (idempotent retry-veilig).
//  2. persistRun(result) → finalize: writes observations + updates run-totals
//     in transaction. Caller is normaliter agent-loop na succesvolle finish.
// =============================================================

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  AgentLoopResult,
  BrandclawRunContext,
  ToolCallTraceEntry,
} from "./types";
import type { CostBreakdown } from "./cost-calculator";

/**
 * Creëer de StrategyObservationRun row vooraan in de loop (zodat de
 * runId vast staat vóór observations gepersisteerd worden + tools
 * referencable). Idempotent — `upsert` op cuid voorkomt duplicate-key
 * bij retry/replay.
 *
 * Velden die we vooraf NIET kennen (totalCostUsd, latencyMs,
 * toolCallTrace) krijgen tijdelijk placeholder-waardes; `finalizeRun`
 * vult ze in na loop-end.
 */
export async function createRunRow(input: {
  runId: string;
  ctx: BrandclawRunContext;
}): Promise<void> {
  const { runId, ctx } = input;
  await prisma.strategyObservationRun.upsert({
    where: { id: runId },
    create: {
      id: runId,
      workspaceId: ctx.workspaceId,
      triggerType: ctx.triggerType,
      triggerSource: ctx.triggerSource,
      agentVersion: ctx.agentVersion,
      promptVersion: ctx.promptVersion,
      toolCallTrace: [],
      totalCostUsd: new Prisma.Decimal(0),
      latencyMs: 0,
    },
    // Geen update — placeholder-row mag niet overschreven worden bij
    // dubbele createRunRow-call (theoretisch retry-pad).
    update: {},
  });
}

/**
 * Finalize de run: schrijf toolCallTrace + cost + latency naar de run-row
 * + bulk-insert alle observations in één transaction. Returns het aantal
 * observations dat persisted is voor audit logging.
 */
export async function persistRun(result: AgentLoopResult, cost: CostBreakdown): Promise<{ observationsWritten: number }> {
  const observationData = result.observations.map((obs) => ({
    workspaceId: result.workspaceId,
    runId: result.runId,
    dimension: obs.dimension,
    severity: obs.severity,
    confidence: obs.confidence,
    summary: obs.summary,
    evidence: obs.evidence as unknown as Prisma.InputJsonValue,
    agentVersion: result.agentVersion,
    promptVersion: result.promptVersion,
  }));

  await prisma.$transaction([
    prisma.strategyObservationRun.update({
      where: { id: result.runId },
      data: {
        toolCallTrace: serializeToolCallTrace(result.toolCallTrace),
        totalCostUsd: new Prisma.Decimal(cost.totalUsd),
        latencyMs: result.latencyMs,
      },
    }),
    ...(observationData.length > 0
      ? [
          prisma.strategyObservation.createMany({
            data: observationData,
          }),
        ]
      : []),
  ]);

  return { observationsWritten: observationData.length };
}

/**
 * Truncate de output-payload per trace-entry voor JSON-size budget op
 * StrategyObservationRun.toolCallTrace (Postgres jsonb default-cap is
 * ruim maar we willen niet 100KB+ per run). 4KB per output is genoeg
 * voor agent-debugging zonder de hele tool-response te bewaren — de
 * echte data zit al immutable in DataSnapshot rows die de tools
 * materializen.
 */
function serializeToolCallTrace(
  trace: ToolCallTraceEntry[],
): Prisma.InputJsonValue {
  const MAX_OUTPUT_BYTES = 4096;
  return trace.map((entry) => {
    let outputJson: string;
    try {
      outputJson = JSON.stringify(entry.output);
    } catch {
      outputJson = "[unserializable output]";
    }
    const truncated = outputJson.length > MAX_OUTPUT_BYTES;
    const safeOutput = truncated
      ? outputJson.slice(0, MAX_OUTPUT_BYTES) + "…[truncated]"
      : outputJson;
    return {
      toolUseId: entry.toolUseId,
      toolName: entry.toolName,
      input: entry.input,
      output: safeOutput,
      isError: entry.isError,
      errorCode: entry.errorCode,
      latencyMs: entry.latencyMs,
      calledAt: entry.calledAt,
      outputTruncated: truncated,
    };
  }) as unknown as Prisma.InputJsonValue;
}
