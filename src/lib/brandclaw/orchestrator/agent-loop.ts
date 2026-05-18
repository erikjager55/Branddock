// =============================================================
// Brandclaw orchestrator — Anthropic tool-use agent-loop (ADR 2026-05-08).
//
// Multi-turn loop:
//   1. Send system + user-prompt naar Anthropic met node-specific tools
//   2. Wanneer response.stop_reason === 'tool_use': execute alle tool_use
//      blocks via registry, build user-message met tool_result blocks
//      voor de volgende turn, loop
//   3. Wanneer response.stop_reason === 'end_turn': finalize → parse
//      observations uit final-message + persist
//
// Guards:
//   - Hard-timeout: 5 minuten (default, configurable). Wallclock-cap,
//     niet per-turn — bij timeout: truncated=true + persist partial.
//   - Max tool-calls per run: 20 (default). Voorkomt cost-explosion bij
//     agent die infinite tools blijft callen.
//   - Per-tool retry: 0 (v1). Failures gaan direct als isError naar agent
//     zodat die kan kiezen om alternatief te zoeken of stop.
//
// Niet inbegrepen v1:
//   - Streaming response (we wachten op complete response per turn voor
//     simpel state-management; latency-tradeoff acceptabel voor batch-mode
//     Analyst-runs).
//   - Prompt-caching (toekomst — system-prompt is per node identiek
//     binnen agentVersion, cache_control headers leveren ~90% korting).
// =============================================================

import Anthropic from "@anthropic-ai/sdk";
import { getToolRegistry } from "./tool-registry";
import { computeRunCost } from "./cost-calculator";
import { createRunRow, persistRun } from "./persistence";
import type {
  AgentLoopResult,
  AnthropicClient,
  BrandclawRunContext,
  ObservationDraft,
  ToolCallTraceEntry,
} from "./types";

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

/**
 * Hoofd-entry. Run de agent-loop, persist run + observations, return result.
 * Caller geeft een runId mee via ctx; createRunRow zorgt voor placeholder
 * vooraan zodat tool-calls de FK kunnen referenceren tijdens de loop.
 */
export async function runAgentLoop(input: RunAgentLoopInput): Promise<AgentLoopResult> {
  const {
    systemPrompt,
    userMessage,
    ctx,
    model = DEFAULT_MODEL,
    maxTokens = DEFAULT_MAX_TOKENS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxToolCalls = DEFAULT_MAX_TOOL_CALLS,
  } = input;

  const client = getClient();
  const registry = getToolRegistry();
  const tools = registry.getToolsForNode(ctx.nodeType);
  const toolDefs = tools.map((t) => t.definition);

  await createRunRow({ runId: ctx.runId, ctx });

  const startedAt = Date.now();
  const deadline = startedAt + timeoutMs;
  const toolCallTrace: ToolCallTraceEntry[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let truncated = false;
  let finalMessage: string | null = null;

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
      break;
    }

    let response;
    try {
      response = await client.messages.create(
        {
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          tools: toolDefs.length > 0 ? toolDefs : undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          messages: messages as any,
        },
        { timeout: Math.max(1000, deadline - Date.now()) },
      );
    } catch (err) {
      // Anthropic API error → abort loop, persist truncated met partial trace
      console.error("[brandclaw agent-loop] Anthropic error:", err instanceof Error ? err.message : err);
      truncated = true;
      break;
    }

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

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
          content: JSON.stringify(result.content),
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
  const observations = extractObservations(finalMessage);
  const cost = computeRunCost({
    model,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
  });

  const result: AgentLoopResult = {
    runId: ctx.runId,
    workspaceId: ctx.workspaceId,
    nodeType: ctx.nodeType,
    agentVersion: ctx.agentVersion,
    promptVersion: ctx.promptVersion,
    toolCallTrace,
    observations,
    latencyMs,
    totalCostUsd: cost.totalUsd,
    totalInputTokens,
    totalOutputTokens,
    truncated,
    finalMessage,
  };

  // Fire-and-forget vs await? Await — caller wil hard-confirmation dat
  // observations persisted zijn vóór return (audit-trail eis).
  await persistRun(result, cost);

  // PostHog telemetry — fire-and-forget zoals gate-metrics patroon.
  // Failures spoilen het run-result niet; PostHog kan offline zijn.
  void emitBrandclawRunCompleted(result, cost, toolCallCount).catch(() => {
    /* logged binnen trackEvent */
  });

  return result;
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

/**
 * Parse observation-drafts uit de final agent-message. Verwacht JSON-blok
 * in de message body (markdown-fenced of plain). Lenient: returns lege
 * array wanneer geen parseable JSON gevonden — caller kan dan op
 * finalMessage zelf surfacing zonder structured observations.
 *
 * Verwachte shape:
 *   { "observations": [{ dimension, severity, confidence, summary, evidence }] }
 */
function extractObservations(finalMessage: string | null): ObservationDraft[] {
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
