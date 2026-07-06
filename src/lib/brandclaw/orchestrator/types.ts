// =============================================================
// Brandclaw orchestrator — gedeelde types (ADR 2026-05-08).
//
// Tool-use orchestrator wordt door alle Brandclaw-nodes hergebruikt:
//   - strategy_analyst (eerste node, BCP Phase 3)
//   - campaign_builder (maand 5-6 post-launch)
//   - measurement_eval (maand 7-9)
//   - optimization (maand 10-12)
//
// Elk node-type heeft eigen tool-set (per-node-type isolatie in
// registry). Tools delen wel dezelfde Anthropic SDK setup en
// run-context shape, zodat downstream nodes plug-and-play kunnen
// uitbreiden zonder herwerking van de loop-mechaniek.
// =============================================================

import type Anthropic from "@anthropic-ai/sdk";
import type { CostBreakdown } from "./cost-calculator";

/** Brandclaw-node identifiers. Per-process namespace voor tool-registratie. */
export type NodeType =
  | "strategy_analyst"
  | "campaign_builder"
  | "measurement_eval"
  | "optimization";

/**
 * Tool-namespace voor user-facing agents (ADR 2026-07-05 D1/D4). Template-
 * literal type zodat de orchestrator géén import op `src/lib/agents` nodig
 * heeft (dependency-richting: agents → orchestrator, nooit andersom).
 * Conventie: `agent:${AgentId}`, bv. "agent:research-analyst".
 */
export type AgentToolNamespace = `agent:${string}`;

/**
 * Registry-namespace: Brandclaw-nodes én agent-namespaces delen dezelfde
 * tool-registry met per-namespace isolatie.
 */
export type ToolNamespace = NodeType | AgentToolNamespace;

/** Trigger-context per run — bepaalt persistence-metadata + cost-attribution. */
export type TriggerType = "manual" | "scheduled" | "event_driven";

/**
 * Run-context wordt aan elke tool-execute call meegegeven. Bevat alles wat
 * een tool nodig heeft om workspace-isolated te queryen + om zichzelf
 * correct te attribueren in de toolCallTrace JSON.
 */
export interface BrandclawRunContext {
  /** Workspace-scope — verplicht voor ALLE tool-execute calls (cross-workspace queries zijn nooit toegestaan). */
  workspaceId: string;
  /** Welke node/agent-namespace deze run uitvoert — bepaalt tool-set en persistence-target. */
  nodeType: ToolNamespace;
  /** Semver van node-implementatie (e.g. 'strategy-analyst@0.1.0'). Drift-detection signaal. */
  agentVersion: string;
  /** Hash of versie-tag van system-prompt. A/B-testing handvat. */
  promptVersion: string;
  /** Cuid van de StrategyObservationRun row die deze loop populated. */
  runId: string;
  /** Wat deze run triggerde — manual/scheduled/event_driven. */
  triggerType: TriggerType;
  /** User-id voor manual, cron-name voor scheduled, event-id voor event_driven. */
  triggerSource: string | null;
  /**
   * Expliciete user-attributie voor tools die een userId vereisen (Claw-
   * tool-bridge, F-VAL). NIET triggerSource hergebruiken: dat veld draagt
   * bij scheduled/event-runs een cron-/event-naam — geen user.
   */
  userId?: string | null;
}

/**
 * Anthropic tool-definition zoals de SDK het verwacht. Komt 1-op-1 in
 * de Messages-API request.tools array terecht. JSON-schema voor input
 * validation laten we aan Anthropic over — Zod-on-input zou dubbel werk
 * zijn binnen de loop.
 */
export interface AnthropicToolDefinition {
  name: string;
  description: string;
  // JSON-schema shape; ruim genoeg voor unie van string/number/array/object.
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Resultaat van een tool-execute call. Plain-object dat naar Anthropic
 * gestuurd wordt als tool_result content-block. Errors zijn structured
 * zodat agent kan kiezen om retry of skip.
 */
export interface ToolExecuteResult {
  /** JSON-serializable payload — wordt door Anthropic gezien als tool-output. */
  content: unknown;
  /** True wanneer tool faalde; Anthropic mag dan op error-respond reageren. */
  isError?: boolean;
  /** Optionele structured error-info voor logging + retry-strategie. */
  errorCode?: string;
}

/**
 * Brandclaw-tool: definition + execute-function. Tools registreren zich
 * via `toolRegistry.register(nodeType, tool)` (zie tool-registry.ts).
 */
export interface BrandclawTool {
  /** Anthropic tool-definition voor de Messages-API. */
  definition: AnthropicToolDefinition;
  /**
   * Execute de tool met (input, ctx). Mag throw'en bij ongeldige input;
   * agent-loop catched naar isError=true result.
   */
  execute(
    input: Record<string, unknown>,
    ctx: BrandclawRunContext,
  ): Promise<ToolExecuteResult>;
}

/**
 * Output van één agent-loop run. Wordt naar StrategyObservationRun
 * gepersisteerd. Observations[] wordt naar StrategyObservation gepersisteerd
 * met run-FK.
 */
export interface AgentLoopResult {
  runId: string;
  workspaceId: string;
  nodeType: ToolNamespace;
  agentVersion: string;
  promptVersion: string;

  /** Sequence van tool-calls die de agent uitvoerde (audit trail). */
  toolCallTrace: ToolCallTraceEntry[];

  /** Observations geproduceerd door de agent (gestructureerd via final response). */
  observations: ObservationDraft[];

  /** Wall-clock duration van start tot end. */
  latencyMs: number;
  /** Totaal Anthropic-API cost over alle turns. */
  totalCostUsd: number;
  /** Aantal input + output tokens (totaal over alle turns). */
  totalInputTokens: number;
  totalOutputTokens: number;

  /** Truncated wanneer hard-timeout of max-tool-calls bereikt; observations dan partial. */
  truncated: boolean;
  /** Final agent-message text (na alle tool-rounds). */
  finalMessage: string | null;
}

export interface ToolCallTraceEntry {
  /** Anthropic tool-use-id zodat tool_result correct correleert. */
  toolUseId: string;
  toolName: string;
  /** Geserialized tool-input zoals de agent het aanriep. */
  input: Record<string, unknown>;
  /** Geserialized tool-output (truncated naar 4KB voor JSON-size budget). */
  output: unknown;
  isError: boolean;
  errorCode: string | null;
  latencyMs: number;
  /** Tijdstip waarop tool werd aangeroepen — chronological ordering. */
  calledAt: string;
}

/**
 * Observation-draft zoals de agent het produceert. Niet 1-op-1 het Prisma-
 * shape: id wordt door persistence-laag gegenereerd, runId wordt geïnjecteerd.
 */
export interface ObservationDraft {
  dimension: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  summary: string;
  /** Citation-keys naar DataSnapshot ids + tool-call refs. */
  evidence: {
    snapshotIds?: string[];
    toolCalls?: Array<{ name: string; inputHash?: string }>;
  };
}

/** Anthropic SDK client-instance — singleton in de orchestrator (geen re-init per loop). */
export type AnthropicClient = InstanceType<typeof Anthropic>;

// =============================================================
// Output-contract types (ADR 2026-07-05-agents-architectuur, D2).
//
// De multi-turn loop is generiek; wat er met de final-message gebeurt
// (parsen + persisteren) is per afnemer verschillend. Een output-
// contract koppelt parser + persistence-adapter aan een run. Het
// bestaande observations-pad is de eerste adapter (observations-
// adapter.ts); user-facing agents leveren een artifact-contract
// (src/lib/agents/registry/). De orchestrator kent géén van beide
// persistence-targets — hij roept alleen het contract aan.
// =============================================================

/** Raw outcome van de multi-turn loop, vóór parsing/persistence. */
export interface LoopOutcome {
  finalMessage: string | null;
  toolCallTrace: ToolCallTraceEntry[];
  totalInputTokens: number;
  totalOutputTokens: number;
  toolCallCount: number;
  truncated: boolean;
  latencyMs: number;
  /**
   * Laatste Anthropic stop_reason ("end_turn" | "max_tokens" | "tool_use" |
   * null bij API-error vóór eerste response). Contracts gebruiken dit om
   * afgekapte output ("max_tokens") te onderscheiden van een parse-miss.
   */
  lastStopReason: string | null;
  /**
   * Waaróm de loop vroegtijdig stopte (null = normale end_turn). Contracts
   * gebruiken dit voor een eerlijke user-facing error: een API-outage is
   * geen "guard-truncatie".
   */
  abortReason: LoopAbortReason | null;
}

/** Reden van vroegtijdige loop-afbraak. */
export type LoopAbortReason = "timeout" | "max_tool_calls" | "api_error";

/** Context die aan een contract-persist wordt meegegeven. */
export interface OutputContractContext {
  ctx: BrandclawRunContext;
  outcome: LoopOutcome;
  cost: CostBreakdown;
  model: string;
}

/**
 * Per-run output-contract: parser + persistence-adapter.
 * `parse` mag throwen (run wordt dan FAILED door de caller); `persist`
 * MOET atomair zijn (run-row-update + output-inserts in één transactie).
 */
export interface AgentOutputContract<TParsed, TPersisted> {
  /** Stabiel id voor logging/tracing, bv. "observations@1", "agent-artifacts@1". */
  id: string;
  parse(finalMessage: string | null, outcome: LoopOutcome): TParsed;
  persist(parsed: TParsed, context: OutputContractContext): Promise<TPersisted>;
}

/** Resultaat van een contract-run — de niet-observations-broer van AgentLoopResult. */
export interface ContractRunResult<TParsed, TPersisted> {
  runId: string;
  workspaceId: string;
  parsed: TParsed;
  persisted: TPersisted;
  finalMessage: string | null;
  toolCallTrace: ToolCallTraceEntry[];
  toolCallCount: number;
  latencyMs: number;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  truncated: boolean;
  /** Volledige cost-breakdown (model + fallback-flag) voor telemetry-consumers. */
  costBreakdown: CostBreakdown;
}
