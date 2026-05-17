// =============================================================
// Brandclaw orchestrator — public API (ADR 2026-05-08).
//
// Caller-facing exports voor de Brandclaw agent-orchestrator. Tools
// registreren zich via side-effect import in src/lib/brandclaw/tools/
// (volgende task — strategy_analyst tool-set v1).
// =============================================================

export { runAgentLoop } from "./agent-loop";
export type { RunAgentLoopInput } from "./agent-loop";

export { getToolRegistry, getRegistryForTests } from "./tool-registry";

export {
  computeRunCost,
  ANTHROPIC_PRICING_PER_M_TOKENS,
} from "./cost-calculator";
export type { CostBreakdown } from "./cost-calculator";

export { createRunRow, persistRun } from "./persistence";

export type {
  NodeType,
  TriggerType,
  BrandclawRunContext,
  BrandclawTool,
  AnthropicToolDefinition,
  ToolExecuteResult,
  AgentLoopResult,
  ToolCallTraceEntry,
  ObservationDraft,
} from "./types";
