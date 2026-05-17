// =============================================================
// Strategy Analyst — public entry point (ADR 2026-05-08, Phase A).
//
// Wrap't runAgentLoop met node-specific defaults: agentVersion +
// promptVersion stamping, system-prompt-builder, tools-init via
// side-effect import van src/lib/brandclaw/tools.
//
// Caller (API route / cron / event-handler) doet:
//   const result = await runStrategyAnalyst({
//     workspaceId, triggerType: 'manual', triggerSource: userId
//   });
//
// Returns AgentLoopResult zoals de orchestrator dat geeft —
// runId + observations + cost + latency + truncated-flag.
// =============================================================

import { randomUUID } from "crypto";
import { runAgentLoop } from "../../orchestrator/agent-loop";
import type { AgentLoopResult, TriggerType } from "../../orchestrator/types";
import {
  buildStrategyAnalystSystemPrompt,
  computePromptVersion,
  STRATEGY_ANALYST_AGENT_VERSION,
} from "./system-prompt";

const DEFAULT_USER_MESSAGE =
  "Analyze the brand-strategy signals for this workspace over the past 30 days (voice drift over 90 days). Produce 3-7 high-quality observations following the two-reasons-test methodology.";

export interface RunStrategyAnalystInput {
  workspaceId: string;
  triggerType: TriggerType;
  triggerSource: string | null;
  /** Override de default user-message (optional — voor experiment/A-B testing). */
  userMessage?: string;
}

let toolsInitialized = false;

/**
 * Run de Strategy Analyst voor een workspace. Triggers tools-init bij
 * eerste call (idempotent), bouwt de system-prompt, en delegate'd naar
 * de orchestrator agent-loop. Resultaat is gepersisteerd in
 * StrategyObservationRun + StrategyObservation rijen vóór return.
 */
export async function runStrategyAnalyst(
  input: RunStrategyAnalystInput,
): Promise<AgentLoopResult> {
  if (!toolsInitialized) {
    // Side-effect register de 4 query-tools in de orchestrator-registry.
    // Idempotent — registry-register is overwrite-safe; meerdere imports
    // herregistreren dezelfde tools zonder error.
    await import("../../tools");
    toolsInitialized = true;
  }

  const runId = randomUUID();
  const systemPrompt = buildStrategyAnalystSystemPrompt();
  const promptVersion = computePromptVersion();

  return runAgentLoop({
    systemPrompt,
    userMessage: input.userMessage ?? DEFAULT_USER_MESSAGE,
    ctx: {
      workspaceId: input.workspaceId,
      nodeType: "strategy_analyst",
      agentVersion: STRATEGY_ANALYST_AGENT_VERSION,
      promptVersion,
      runId,
      triggerType: input.triggerType,
      triggerSource: input.triggerSource,
    },
  });
}

export { STRATEGY_ANALYST_AGENT_VERSION, computePromptVersion };
