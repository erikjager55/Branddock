// =============================================================
// Brandclaw orchestrator — observations output-contract (ADR
// 2026-07-05-agents-architectuur, D2).
//
// Het oorspronkelijke, hard-wired outputpad van de agent-loop
// (extractObservations + persistRun → StrategyObservationRun/
// StrategyObservation) als eerste output-contract-adapter. De code is
// verbatim verplaatst uit agent-loop.ts — gedrag is byte-identiek;
// alleen de aanroep-vorm is gegeneraliseerd zodat user-facing agents
// (src/lib/agents/registry/) een eigen artifact-contract kunnen
// leveren zonder tweede loop.
// =============================================================

import { persistRun } from "./persistence";
import type {
  AgentLoopResult,
  AgentOutputContract,
  ObservationDraft,
} from "./types";

/**
 * Default-contract voor Brandclaw-nodes: parse't observations uit de
 * final-message en persisteert via het ongewijzigde persistRun-pad.
 */
export const observationsOutputContract: AgentOutputContract<
  ObservationDraft[],
  { observationsWritten: number }
> = {
  id: "observations@1",
  parse(finalMessage) {
    return extractObservations(finalMessage);
  },
  async persist(parsed, { ctx, outcome, cost }) {
    // persistRun leest alleen run-identiteit + trace + observations uit
    // het result-object; we assembleren het hier uit ctx + outcome zodat
    // de transactie exact dezelfde data schrijft als pre-refactor.
    const result: AgentLoopResult = {
      runId: ctx.runId,
      workspaceId: ctx.workspaceId,
      nodeType: ctx.nodeType,
      agentVersion: ctx.agentVersion,
      promptVersion: ctx.promptVersion,
      toolCallTrace: outcome.toolCallTrace,
      observations: parsed,
      latencyMs: outcome.latencyMs,
      totalCostUsd: cost.totalUsd,
      totalInputTokens: outcome.totalInputTokens,
      totalOutputTokens: outcome.totalOutputTokens,
      truncated: outcome.truncated,
      finalMessage: outcome.finalMessage,
    };
    return persistRun(result, cost);
  },
};

/**
 * Parse observation-drafts uit de final agent-message. Verwacht JSON-blok
 * in de message body (markdown-fenced of plain). Lenient: returns lege
 * array wanneer geen parseable JSON gevonden — caller kan dan op
 * finalMessage zelf surfacing zonder structured observations.
 *
 * Verwachte shape:
 *   { "observations": [{ dimension, severity, confidence, summary, evidence }] }
 */
export function extractObservations(finalMessage: string | null): ObservationDraft[] {
  if (!finalMessage) return [];
  // Probeer eerst markdown-fenced JSON-blok.
  const fencedMatch = finalMessage.match(/```(?:json)?\n([\s\S]*?)\n```/);
  const candidate = fencedMatch ? fencedMatch[1] : finalMessage;
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return [];
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as { observations?: unknown }).observations)
  ) {
    return [];
  }
  const rawList = (parsed as { observations: unknown[] }).observations;
  const observations: ObservationDraft[] = [];
  for (const item of rawList) {
    if (!item || typeof item !== "object") continue;
    const obs = item as Record<string, unknown>;
    if (
      typeof obs.dimension !== "string" ||
      typeof obs.summary !== "string" ||
      typeof obs.severity !== "string" ||
      typeof obs.confidence !== "string"
    ) {
      continue;
    }
    const severity = obs.severity.toUpperCase();
    const confidence = obs.confidence.toUpperCase();
    if (!["HIGH", "MEDIUM", "LOW"].includes(severity)) continue;
    if (!["HIGH", "MEDIUM", "LOW"].includes(confidence)) continue;
    observations.push({
      dimension: obs.dimension,
      severity: severity as "HIGH" | "MEDIUM" | "LOW",
      confidence: confidence as "HIGH" | "MEDIUM" | "LOW",
      summary: obs.summary,
      evidence:
        obs.evidence && typeof obs.evidence === "object"
          ? (obs.evidence as ObservationDraft["evidence"])
          : {},
    });
  }
  return observations;
}
