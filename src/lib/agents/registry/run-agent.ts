// =============================================================
// Agents registry — run-entry (ADR 2026-07-05, D1/D5).
//
// Bezit de AgentRun-lifecycle rond runAgentWithContract: placeholder
// (RUNNING) vóór de loop, contract-finalize (COMPLETED/FAILED +
// artefacten, atomair) ín de loop-call, best-effort FAILED in de
// catch. De orchestrator zelf blijft agnostisch van het AgentRun-model.
//
// Model-resolutie per agent via resolveFeatureModel (vervangt de
// hardcoded Sonnet-default voor agent-runs, ADR D1) + assertProvider —
// de loop is gebouwd op de Anthropic tool-use API.
// =============================================================

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  OutputContractError,
  runAgentWithContract,
} from "@/lib/brandclaw/orchestrator/agent-loop";
import { serializeToolCallTrace } from "@/lib/brandclaw/orchestrator/persistence";
import type { TriggerType } from "@/lib/brandclaw/orchestrator/types";
import {
  assertProvider,
  resolveFeatureModel,
} from "@/lib/ai/feature-models.server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { chargeAfter } from "@/lib/billing/credits/meter-generation";
import { clearRunCollector } from "./run-collector";
import { getAgentDefinition, isTestAgentAllowed } from "./index";
import type { AgentContextSelection } from "./types";
import type { AgentDefinition } from "./types";

/** Route vertaalt deze naar 400 — onderscheidt user-fout van server-fout. */
export class UnknownAgentError extends Error {}
export class UnknownUseCaseError extends Error {}

export interface RunAgentInput {
  workspaceId: string;
  /** Acting identity van de run. Manual: de sessie-user. Scheduled (Fase 2):
   * de schedule-creator — vereist, want het propose-only write-pad
   * (tool-bridge NO_USER_CONTEXT-guard) weigert zonder user. */
  userId: string;
  /** Unvalidated agent id from the request body. */
  agentId: string;
  useCaseId?: string;
  /** Free-form run input; `message` (string) feeds the prompt. Stored verbatim on AgentRun.input. */
  input?: Record<string, unknown>;
  /** Optionele content-sources-selectie (pariteit met de Brand Assistant);
   * beïnvloedt alleen de system-prompt — bewust niet op de run-rij persisted. */
  contextSelection?: AgentContextSelection;
  triggerType?: TriggerType;
  /** Override voor AgentRun.triggerSource + de loop-ctx (default: userId).
   * Scheduled runs: `schedule:<scheduleId>` of `job:<jobId>`. */
  triggerSource?: string;
  /** false → onderdrukt de FAILED-notificatie (Fase-2-notify-hook): de
   * AGENT_TASK-handler zet dit alleen op de laatste queue-attempt, zodat
   * een retry-loop één fout-notificatie per job oplevert. Default true. */
  notifyOnFailure?: boolean;
}

export interface RunAgentResponse {
  runId: string;
  status: "COMPLETED" | "FAILED" | "AWAITING_CONFIRMATION";
  artifactIds: string[];
  totalCostUsd: number;
  latencyMs: number;
  truncated: boolean;
  error: string | null;
}

/**
 * De run-route heeft `maxDuration = 800` (Vercel Fluid). Clamp per-agent
 * timeouts met marge ónder die platform-kill zodat de loop-guard vóór de
 * kill afgaat en de catch de run netjes op FAILED zet (de loop bindt óók
 * elke Anthropic-request-timeout aan de rest-deadline). Restgaten die dit
 * niet dekt: hangende tool-executes (pipeline-tools in motor-wiring moeten
 * eigen timeouts hebben — belegd in die task) en een harde proces-kill;
 * daarvoor zijn de cron-reapers (src/lib/agents/jobs/reaper.ts) + de
 * stale-RUNNING-heuristiek in de inbox.
 */
const MAX_RUN_TIMEOUT_MS = 740_000;

/** Async system-prompt-builders (brand-context-fetches) vallen buiten de loop-guard — eigen deadline. */
const SYSTEM_PROMPT_TIMEOUT_MS = 60_000;

async function withDeadline<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function resolveUserMessage(
  def: AgentDefinition,
  useCaseId: string | undefined,
  input: Record<string, unknown>,
): string {
  // Lege input mag niet als "{}" bij het model landen — dan geldt de
  // default-opdracht (of een template met lege {{input}}-substitutie).
  const inputMessage =
    typeof input.message === "string"
      ? input.message
      : Object.keys(input).length > 0
        ? JSON.stringify(input)
        : "";
  if (!useCaseId) {
    return inputMessage || "Perform your role for this workspace and produce your output artifacts.";
  }
  const useCase = def.useCases.find((u) => u.id === useCaseId);
  if (!useCase) {
    throw new UnknownUseCaseError(`Unknown use-case '${useCaseId}' for agent '${def.id}'`);
  }
  // Function-replacer: bij een string-replacement zijn $-patronen ($&, $`, $')
  // speciaal en zouden ze user-input stil corrumperen.
  return useCase.promptTemplate.replaceAll("{{input}}", () => inputMessage);
}

/**
 * Run een catalogus-agent synchroon. Returnt ALTIJD een response met
 * runId zodra de run-rij bestaat — ook bij failure (status FAILED +
 * begrijpelijke error); de client heeft de runId nodig voor de inbox.
 * Throws alleen vóór run-creatie (onbekende agent/use-case, model-
 * resolutie, DB down).
 */
export async function runAgent(inputArgs: RunAgentInput): Promise<RunAgentResponse> {
  const { workspaceId, userId, agentId, useCaseId, triggerType = "manual" } = inputArgs;
  const triggerSource = inputArgs.triggerSource ?? userId;
  const runInput = inputArgs.input ?? {};

  const def = getAgentDefinition(agentId);
  if (!def || (def.hidden && !isTestAgentAllowed())) {
    throw new UnknownAgentError(`Unknown agent '${agentId}'`);
  }

  const userMessage = resolveUserMessage(def, useCaseId, runInput);

  const resolved = await resolveFeatureModel(workspaceId, def.featureKey);
  assertProvider(resolved, "anthropic", def.featureKey);

  // Placeholder vóór de loop (patroon createRunRow): runId staat vast en
  // is querybaar terwijl de run draait.
  const runId = randomUUID();
  await prisma.agentRun.create({
    data: {
      id: runId,
      workspaceId,
      agentId: def.id,
      status: "RUNNING",
      // useCaseId ná de spread: het audit-veld moet de werkelijk gebruikte
      // use-case dragen, niet een user-supplied input.useCaseId.
      input: { ...runInput, useCaseId: useCaseId ?? null } as Prisma.InputJsonValue,
      triggerType,
      triggerSource,
      userId,
      agentVersion: def.agentVersion,
      promptVersion: def.promptVersion,
    },
  });
  // Direct invalideren: de RUNNING-placeholder hoort meteen in de runs-list
  // zichtbaar te zijn, niet pas ná een run van minuten (en dit dekt ook
  // toekomstige non-HTTP-callers zoals de Fase-2-scheduler).
  invalidateCache(cacheKeys.prefixes.agents(workspaceId));

  void emitAgentRunStarted({
    runId,
    workspaceId,
    agentId: def.id,
    useCaseId: useCaseId ?? null,
    triggerType,
    model: resolved.model,
  }).catch(() => {
    /* logged binnen trackEvent */
  });

  try {
    const systemPrompt = await withDeadline(
      Promise.resolve(def.buildSystemPrompt({ workspaceId, contextSelection: inputArgs.contextSelection })),
      SYSTEM_PROMPT_TIMEOUT_MS,
      `buildSystemPrompt for agent '${def.id}' timed out after ${SYSTEM_PROMPT_TIMEOUT_MS}ms`,
    );

    const result = await runAgentWithContract(
      {
        systemPrompt,
        userMessage,
        ctx: {
          workspaceId,
          nodeType: def.toolNamespace,
          agentVersion: def.agentVersion,
          promptVersion: def.promptVersion,
          runId,
          triggerType,
          triggerSource,
          userId,
        },
        model: resolved.model,
        timeoutMs:
          def.timeoutMs !== undefined ? Math.min(def.timeoutMs, MAX_RUN_TIMEOUT_MS) : undefined,
        maxToolCalls: def.maxToolCalls,
        maxTokens: def.maxTokens,
      },
      def.outputContract,
    );

    const response: RunAgentResponse = {
      runId,
      status: result.persisted.status,
      artifactIds: result.persisted.artifactIds,
      totalCostUsd: result.totalCostUsd,
      latencyMs: result.latencyMs,
      truncated: result.truncated,
      error: result.persisted.error,
    };

    // Credit-afboeking (Fase 2): alleen content-producerende agents (def.billable)
    // boeken output-credits af; analyse/F-VAL/research/exploratie = gratis (ADR §2/§3).
    // Alleen op COMPLETED: een FAILED-run levert niets; een AWAITING_CONFIRMATION-run
    // is een *proposal* (de echte levering + charge horen bij de confirm-route — Fase 3),
    // dus geen charge op proposal-tokens. Post-hoc, idempotent per run.
    if (def.billable && response.status === "COMPLETED") {
      await chargeAfter(
        {
          workspaceId,
          action: "agent-deliverable",
          feature: `agent:${def.id}`,
          idempotencyKey: `agent-charge:${runId}`,
        },
        { outputTokens: result.totalOutputTokens, model: result.costBreakdown.model },
      ).catch((e) => {
        console.warn("[run-agent] credit-charge failed (swallowed)", {
          runId,
          error: e instanceof Error ? e.message : String(e),
        });
      });
    }

    void emitAgentRunCompleted({
      runId,
      workspaceId,
      agentId: def.id,
      status: response.status,
      latencyMs: result.latencyMs,
      totalCostUsd: result.totalCostUsd,
      inputTokens: result.totalInputTokens,
      outputTokens: result.totalOutputTokens,
      toolCalls: result.toolCallCount,
      artifactCount: response.artifactIds.length,
      truncated: result.truncated,
      model: result.costBreakdown.model,
      pricingFallback: result.costBreakdown.fallback,
    }).catch(() => {
      /* logged binnen trackEvent */
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Agent run failed unexpectedly";
    // Collector-entries van deze run opruimen (proposals/artefacten die de
    // finalize nooit gedraind heeft) — voorkomt lekkende map-entries.
    clearRunCollector(runId);
    // Wanneer de loop wél draaide maar parse/persist faalde, draagt
    // OutputContractError de outcome + kosten — die horen op de FAILED-rij
    // (cost-instrumentatie is dag-1-eis; persist-failures mogen geen
    // kosten-gat slaan in de latere budget-bewaking).
    const contractErr = err instanceof OutputContractError ? err : null;

    // Best-effort finalize — de run-rij mag niet op RUNNING blijven staan
    // voor fouten die we in-process zien. Artefacten zijn er niet: de
    // enige artifact-writes zitten in de contract-transactie die faalde.
    try {
      await prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: "FAILED",
          error: message,
          completedAt: new Date(),
          ...(contractErr
            ? {
                toolCallTrace: serializeToolCallTrace(contractErr.outcome.toolCallTrace),
                finalMessage: contractErr.outcome.finalMessage,
                totalCostUsd: new Prisma.Decimal(contractErr.costBreakdown.totalUsd),
                inputTokens: contractErr.outcome.totalInputTokens,
                outputTokens: contractErr.outcome.totalOutputTokens,
                latencyMs: contractErr.outcome.latencyMs,
                truncated: contractErr.outcome.truncated,
              }
            : {}),
        },
      });
    } catch {
      console.warn("[agents run-agent] failed to mark run FAILED", { runId, message });
    }

    void emitAgentRunCompleted({
      runId,
      workspaceId,
      agentId: def.id,
      status: "FAILED",
      latencyMs: contractErr?.outcome.latencyMs ?? 0,
      totalCostUsd: contractErr?.costBreakdown.totalUsd ?? 0,
      inputTokens: contractErr?.outcome.totalInputTokens ?? 0,
      outputTokens: contractErr?.outcome.totalOutputTokens ?? 0,
      toolCalls: contractErr?.outcome.toolCallCount ?? 0,
      artifactCount: 0,
      truncated: contractErr?.outcome.truncated ?? false,
      model: resolved.model,
      pricingFallback: contractErr?.costBreakdown.fallback ?? false,
    }).catch(() => {
      /* logged binnen trackEvent */
    });

    return {
      runId,
      status: "FAILED",
      artifactIds: [],
      totalCostUsd: contractErr?.costBreakdown.totalUsd ?? 0,
      latencyMs: contractErr?.outcome.latencyMs ?? 0,
      truncated: contractErr?.outcome.truncated ?? false,
      error: message,
    };
  }
}

async function emitAgentRunStarted(args: {
  runId: string;
  workspaceId: string;
  agentId: string;
  useCaseId: string | null;
  triggerType: TriggerType;
  model: string;
}): Promise<void> {
  const { trackEvent } = await import("@/lib/analytics/posthog");
  await trackEvent({
    event: "agent_run_started",
    workspaceId: args.workspaceId,
    properties: {
      run_id: args.runId,
      agent_id: args.agentId,
      use_case_id: args.useCaseId,
      trigger_type: args.triggerType,
      model: args.model,
    },
  });
}

async function emitAgentRunCompleted(args: {
  runId: string;
  workspaceId: string;
  agentId: string;
  status: string;
  latencyMs: number;
  totalCostUsd: number;
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
  artifactCount: number;
  truncated: boolean;
  model: string;
  pricingFallback: boolean;
}): Promise<void> {
  const { trackEvent } = await import("@/lib/analytics/posthog");
  await trackEvent({
    event: "agent_run_completed",
    workspaceId: args.workspaceId,
    properties: {
      run_id: args.runId,
      agent_id: args.agentId,
      status: args.status,
      latency_ms: args.latencyMs,
      total_cost_usd: args.totalCostUsd,
      input_tokens: args.inputTokens,
      output_tokens: args.outputTokens,
      tool_calls: args.toolCalls,
      artifact_count: args.artifactCount,
      truncated: args.truncated,
      model: args.model,
      pricing_fallback: args.pricingFallback,
    },
  });
}
