// =============================================================
// Brandclaw orchestrator — Anthropic tool-use agent-loop (ADR 2026-05-08;
// output-contract-generalisatie: ADR 2026-07-05-agents-architectuur D2).
//
// Multi-turn loop (runLoopCore — verbatim de oorspronkelijke mechaniek):
//   1. Send system + user-prompt naar Anthropic met namespace-specific tools
//   2. Wanneer response.stop_reason === 'tool_use': execute alle tool_use
//      blocks via registry, build user-message met tool_result blocks
//      voor de volgende turn, loop
//   3. Wanneer response.stop_reason === 'end_turn': finalize → parse +
//      persist via het output-contract
//
// Output-lagen:
//   - runAgentLoop(input)            → observations-pad (Brandclaw-nodes),
//     gedrag byte-identiek aan pre-refactor: createRunRow → loop →
//     persistRun (via observations-adapter) → PostHog-emit.
//   - runAgentLoop(input, contract)  → gelijk aan runAgentWithContract.
//   - runAgentWithContract(input, c) → generieke motor voor user-facing
//     agents: GEEN placeholder-write (de caller bezit de run-row-
//     lifecycle, bv. AgentRun in src/lib/agents/registry/run-agent.ts).
//
// Guards:
//   - Hard-timeout: 5 minuten (default, configurable). Wallclock-cap,
//     niet per-turn — bij timeout: truncated=true + persist partial.
//   - Max tool-calls per run: 20 (default). Voorkomt cost-explosion bij
//     agent die infinite tools blijft callen.
//   - Per-tool retry: 0 (v1). Failures gaan direct als isError naar agent
//     zodat die kan kiezen om alternatief te zoeken of stop.
//
// Streaming (agents-scheduling slice 5, 2026-07-13): elke turn loopt via
// client.messages.stream(...).finalMessage() — de SDK accumuleert text- en
// tool_use-input-deltas + usage tot een compleet Message, dus alles ná de
// call-site bleef byte-identiek. Dit heft het non-streaming SDK-plafond van
// 21.333 max_tokens per turn op (gotcha 2026-07-12); de wallclock-guards
// (timeoutMs → AbortSignal, maxToolCalls) blijven de echte begrenzing.
//
// Niet inbegrepen v1:
//   - Prompt-caching (toekomst — system-prompt is per node identiek
//     binnen agentVersion, cache_control headers leveren ~90% korting).
// =============================================================

import Anthropic, { APIUserAbortError } from "@anthropic-ai/sdk";
import { getToolRegistry } from "./tool-registry";
import { computeRunCost } from "./cost-calculator";
import type { CostBreakdown } from "./cost-calculator";
import { createRunRow } from "./persistence";
import { observationsOutputContract } from "./observations-adapter";
import type {
  AgentLoopResult,
  AgentOutputContract,
  AnthropicClient,
  BrandclawRunContext,
  ContractRunResult,
  LoopAbortReason,
  LoopOutcome,
  ToolCallTraceEntry,
} from "./types";

/**
 * Thrown wanneer contract.parse of contract.persist faalt NÁ een voltooide
 * loop. Draagt de LoopOutcome + kosten zodat de caller de werkelijk gemaakte
 * Anthropic-kosten en trace alsnog op de FAILED-run kan persisteren
 * (cost-instrumentatie is een dag-1-eis; juist persist-failures mogen geen
 * kosten-gat slaan).
 */
export class OutputContractError extends Error {
  readonly outcome: LoopOutcome;
  readonly costBreakdown: CostBreakdown;
  readonly model: string;

  constructor(
    message: string,
    args: { outcome: LoopOutcome; costBreakdown: CostBreakdown; model: string; cause?: unknown },
  ) {
    super(message, { cause: args.cause });
    this.name = "OutputContractError";
    this.outcome = args.outcome;
    this.costBreakdown = args.costBreakdown;
    this.model = args.model;
  }
}

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_MAX_TOOL_CALLS = 20;

let cachedClient: AnthropicClient | null = null;
function getClient(): AnthropicClient {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set — brandclaw agent-loop cannot start");
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

export interface RunAgentLoopInput {
  systemPrompt: string;
  userMessage: string;
  ctx: BrandclawRunContext;
  /** Override default model (Sonnet 4.6). */
  model?: string;
  /** Max tokens per turn — default 4096. */
  maxTokens?: number;
  /** Hard wallclock-timeout — default 5min. */
  timeoutMs?: number;
  /** Max tool-calls totaal over alle turns — default 20. */
  maxToolCalls?: number;
}

/** Volledig geresolvde loop-input — alle defaults toegepast. */
interface LoopCoreInput {
  systemPrompt: string;
  userMessage: string;
  ctx: BrandclawRunContext;
  model: string;
  maxTokens: number;
  timeoutMs: number;
  maxToolCalls: number;
}

/**
 * Observations-entry (Brandclaw-nodes). Zonder contract: persist run +
 * observations via het oorspronkelijke pad en return AgentLoopResult —
 * gedrag identiek aan pre-refactor. Mét contract: zie runAgentWithContract.
 * Caller geeft een runId mee via ctx; createRunRow zorgt voor placeholder
 * vooraan zodat tool-calls de FK kunnen referenceren tijdens de loop.
 */
export async function runAgentLoop(input: RunAgentLoopInput): Promise<AgentLoopResult>;
export async function runAgentLoop<TParsed, TPersisted>(
  input: RunAgentLoopInput,
  outputContract: AgentOutputContract<TParsed, TPersisted>,
): Promise<ContractRunResult<TParsed, TPersisted>>;
export async function runAgentLoop<TParsed, TPersisted>(
  input: RunAgentLoopInput,
  outputContract?: AgentOutputContract<TParsed, TPersisted>,
): Promise<AgentLoopResult | ContractRunResult<TParsed, TPersisted>> {
  if (outputContract) {
    return runAgentWithContract(input, outputContract);
  }

  // Default observations-pad. Volgorde bewust gelijk aan pre-refactor:
  // client-check → placeholder-row → loop → persist (in contract) →
  // telemetry → return. getClient() vóór createRunRow (cached, gratis)
  // zodat een ontbrekende ANTHROPIC_API_KEY geen orphan-placeholder
  // achterlaat — pre-refactor throwde de client-init ook vóór de row-write.
  getClient();
  await createRunRow({ runId: input.ctx.runId, ctx: input.ctx });
  const contractResult = await runAgentWithContract(input, observationsOutputContract);

  const result: AgentLoopResult = {
    runId: contractResult.runId,
    workspaceId: contractResult.workspaceId,
    nodeType: input.ctx.nodeType,
    agentVersion: input.ctx.agentVersion,
    promptVersion: input.ctx.promptVersion,
    toolCallTrace: contractResult.toolCallTrace,
    observations: contractResult.parsed,
    latencyMs: contractResult.latencyMs,
    totalCostUsd: contractResult.totalCostUsd,
    totalInputTokens: contractResult.totalInputTokens,
    totalOutputTokens: contractResult.totalOutputTokens,
    truncated: contractResult.truncated,
    finalMessage: contractResult.finalMessage,
  };

  // PostHog telemetry — fire-and-forget zoals gate-metrics patroon.
  // Failures spoilen het run-result niet; PostHog kan offline zijn.
  void emitBrandclawRunCompleted(
    result,
    contractResult.costBreakdown,
    contractResult.toolCallCount,
  ).catch(() => {
    /* logged binnen trackEvent */
  });

  return result;
}

/**
 * Generieke contract-entry (ADR 2026-07-05 D2). Draait de loop en laat
 * parsing + persistence volledig aan het meegegeven contract. Doet GEEN
 * placeholder-write — de caller bezit de run-row-lifecycle (create vóór
 * de aanroep, failure-status in zijn eigen catch).
 */
export async function runAgentWithContract<TParsed, TPersisted>(
  input: RunAgentLoopInput,
  contract: AgentOutputContract<TParsed, TPersisted>,
): Promise<ContractRunResult<TParsed, TPersisted>> {
  const {
    systemPrompt,
    userMessage,
    ctx,
    model = DEFAULT_MODEL,
    maxTokens = DEFAULT_MAX_TOKENS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxToolCalls = DEFAULT_MAX_TOOL_CALLS,
  } = input;

  const outcome = await runLoopCore({
    systemPrompt,
    userMessage,
    ctx,
    model,
    maxTokens,
    timeoutMs,
    maxToolCalls,
  });

  const cost = computeRunCost({
    model,
    inputTokens: outcome.totalInputTokens,
    outputTokens: outcome.totalOutputTokens,
  });

  let parsed: TParsed;
  let persisted: TPersisted;
  try {
    parsed = contract.parse(outcome.finalMessage, outcome);
    // Await — caller wil hard-confirmation dat output persisted is vóór
    // return (audit-trail eis, zelfde afweging als pre-refactor persistRun).
    persisted = await contract.persist(parsed, { ctx, outcome, cost, model });
  } catch (err) {
    // Loop is al gedraaid (kosten gemaakt) — geef outcome + cost mee zodat
    // de caller ze op de FAILED-run kan schrijven. Message blijft de
    // originele zodat bestaande error-surfaces identiek rapporteren; de
    // originele error (bv. Prisma-class) zit in `.cause` — callers die op
    // error-type willen switchen moeten dáár kijken, niet op instanceof.
    throw new OutputContractError(err instanceof Error ? err.message : String(err), {
      outcome,
      costBreakdown: cost,
      model,
      cause: err,
    });
  }

  return {
    runId: ctx.runId,
    workspaceId: ctx.workspaceId,
    parsed,
    persisted,
    finalMessage: outcome.finalMessage,
    toolCallTrace: outcome.toolCallTrace,
    toolCallCount: outcome.toolCallCount,
    latencyMs: outcome.latencyMs,
    totalCostUsd: cost.totalUsd,
    totalInputTokens: outcome.totalInputTokens,
    totalOutputTokens: outcome.totalOutputTokens,
    truncated: outcome.truncated,
    costBreakdown: cost,
  };
}

/**
 * De multi-turn loop-mechaniek — verbatim de pre-refactor kern, zonder
 * persistence of parsing. Returnt de raw outcome; wat ermee gebeurt is
 * aan het output-contract van de caller.
 */
async function runLoopCore(input: LoopCoreInput): Promise<LoopOutcome> {
  const { systemPrompt, userMessage, ctx, model, timeoutMs, maxToolCalls, maxTokens } = input;

  const client = getClient();
  const registry = getToolRegistry();
  const tools = registry.getToolsForNode(ctx.nodeType);
  const toolDefs = tools.map((t) => t.definition);

  const startedAt = Date.now();
  const deadline = startedAt + timeoutMs;
  const toolCallTrace: ToolCallTraceEntry[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let truncated = false;
  let finalMessage: string | null = null;
  let lastStopReason: string | null = null;
  let abortReason: LoopAbortReason | null = null;

  // Anthropic Messages-API messages array — accumuleert alle turns.
  // Initial user-turn = inbound userMessage. Daarna voegen we tool_result
  // user-turns toe na elke tool_use-response van de agent.
  const messages: Array<{
    role: "user" | "assistant";
    content: Array<unknown>;
  }> = [
    {
      role: "user",
      content: [{ type: "text", text: userMessage }],
    },
  ];

  let toolCallCount = 0;
  // Multi-turn loop met expliciete iteration-cap — voorkomt infinite-loop
  // bij agent-fout, complementair op max-tool-calls (sommige rounds
  // produceren geen tool-use maar text-thinking).
  const MAX_TURNS = maxToolCalls + 5;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    if (Date.now() > deadline) {
      truncated = true;
      abortReason ??= "timeout";
      break;
    }

    let response;
    try {
      // Streaming per turn: finalMessage() accumuleert text- én tool_use-
      // input-deltas + usage tot een compleet Message — geen SDK-preflight
      // op max_tokens meer. De rest-deadline bindt de turn via AbortSignal.
      const stream = client.messages.stream(
        {
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          tools: toolDefs.length > 0 ? toolDefs : undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          messages: messages as any,
        },
        { signal: AbortSignal.timeout(Math.max(1000, deadline - Date.now())) },
      );
      response = await stream.finalMessage();
    } catch (err) {
      if (err instanceof APIUserAbortError || Date.now() >= deadline) {
        // Deadline-abort mid-stream: zelfde semantiek als de wallclock-check
        // bovenaan de turn — partial trace persisten als timeout.
        console.error("[brandclaw agent-loop] turn afgebroken op rest-deadline");
        truncated = true;
        abortReason ??= "timeout";
        break;
      }
      // Anthropic API error → abort loop, persist truncated met partial trace
      console.error("[brandclaw agent-loop] Anthropic error:", err instanceof Error ? err.message : err);
      truncated = true;
      abortReason = "api_error";
      break;
    }

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;
    lastStopReason = response.stop_reason ?? null;

    // Verzamel alle tool_use blocks die agent vraagt + final-text als die
    // mee in de response zit.
    const toolUseBlocks: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];
    const textBlocks: string[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        toolUseBlocks.push({
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        });
      } else if (block.type === "text") {
        textBlocks.push(block.text);
      }
    }

    // Push assistant turn (volle content array, niet alleen text — anders
    // kan Anthropic op volgende turn niet matchen tool_use → tool_result).
    messages.push({
      role: "assistant",
      content: response.content as unknown as Array<unknown>,
    });

    // Geen tool-calls → agent is klaar (text-only response = end_turn).
    if (toolUseBlocks.length === 0) {
      finalMessage = textBlocks.join("\n").trim() || null;
      break;
    }

    // Execute alle tool_use blocks parallel — Anthropic SDK pattern voor
    // multi-tool-in-one-response. Build user-message met tool_result blocks
    // voor next turn.
    const toolResults: Array<{
      type: "tool_result";
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    }> = [];

    for (const use of toolUseBlocks) {
      if (toolCallCount >= maxToolCalls) {
        // Cap bereikt — return error-result naar agent zodat die kan stoppen.
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: JSON.stringify({
            error: `Max tool-calls per run reached (${maxToolCalls}) — stop calling tools and produce final observations.`,
          }),
          is_error: true,
        });
        truncated = true;
        abortReason ??= "max_tool_calls";
        continue;
      }
      toolCallCount++;

      const tool = registry.getTool(ctx.nodeType, use.name);
      const calledAt = new Date().toISOString();
      const t0 = Date.now();

      if (!tool) {
        // Onbekende tool → error-result. Agent zou dit kunnen detecteren en
        // alternatief proberen.
        const errMsg = `Tool '${use.name}' not registered for node-type '${ctx.nodeType}'`;
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: JSON.stringify({ error: errMsg }),
          is_error: true,
        });
        toolCallTrace.push({
          toolUseId: use.id,
          toolName: use.name,
          input: use.input,
          output: { error: errMsg },
          isError: true,
          errorCode: "TOOL_NOT_FOUND",
          latencyMs: 0,
          calledAt,
        });
        continue;
      }

      try {
        const result = await tool.execute(use.input, ctx);
        const latencyMs = Date.now() - t0;
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          // String-content (bv. gefencede bridge-output) niet dubbel encoden —
          // scheelt escape-ruis/tokens; object-content blijft JSON.
          content:
            typeof result.content === "string" ? result.content : JSON.stringify(result.content),
          is_error: result.isError ?? false,
        });
        toolCallTrace.push({
          toolUseId: use.id,
          toolName: use.name,
          input: use.input,
          output: result.content,
          isError: result.isError ?? false,
          errorCode: result.errorCode ?? null,
          latencyMs,
          calledAt,
        });
      } catch (err) {
        const latencyMs = Date.now() - t0;
        const errMsg = err instanceof Error ? err.message : String(err);
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: JSON.stringify({ error: errMsg }),
          is_error: true,
        });
        toolCallTrace.push({
          toolUseId: use.id,
          toolName: use.name,
          input: use.input,
          output: { error: errMsg },
          isError: true,
          errorCode: "TOOL_EXECUTE_THREW",
          latencyMs,
          calledAt,
        });
      }
    }

    messages.push({
      role: "user",
      content: toolResults as unknown as Array<unknown>,
    });
  }

  const latencyMs = Date.now() - startedAt;

  return {
    finalMessage,
    toolCallTrace,
    totalInputTokens,
    totalOutputTokens,
    toolCallCount,
    truncated,
    latencyMs,
    lastStopReason,
    abortReason,
  };
}

async function emitBrandclawRunCompleted(
  result: AgentLoopResult,
  cost: ReturnType<typeof computeRunCost>,
  toolCallCount: number,
): Promise<void> {
  const { trackEvent } = await import("@/lib/analytics/posthog");
  await trackEvent({
    event: "brandclaw_run_completed",
    workspaceId: result.workspaceId,
    properties: {
      run_id: result.runId,
      node_type: result.nodeType,
      agent_version: result.agentVersion,
      prompt_version: result.promptVersion,
      latency_ms: result.latencyMs,
      total_cost_usd: cost.totalUsd,
      input_tokens: result.totalInputTokens,
      output_tokens: result.totalOutputTokens,
      tool_calls: toolCallCount,
      observations_count: result.observations.length,
      truncated: result.truncated,
      model: cost.model,
      pricing_fallback: cost.fallback,
    },
  });
}
