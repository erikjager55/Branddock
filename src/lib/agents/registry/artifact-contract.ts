// =============================================================
// Agents registry — shared artifact output-contract (ADR 2026-07-05, D2/D3).
//
// Default-contract voor alle catalogus-agents: parse't een fenced-JSON
// `{"artifacts":[...]}`-blok uit de final-message (zelfde lenient
// aanpak als de observations-adapter) en finalize't de AgentRun +
// AgentArtifact-rows in ÉÉN transactie — geen halve artefacten mogelijk.
//
// Status-beslissing (acceptatiecriterium agents-foundation):
//   truncated + 0 artefacten → FAILED  (guard-uitleg als error)
//   truncated + ≥1 artefact  → COMPLETED, truncated=true, uitleg als error
//   normaal                  → COMPLETED (0 artefacten is toegestaan;
//                              finalMessage blijft bewaard voor debugging)
// =============================================================

import { AgentArtifactType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serializeToolCallTrace } from "@/lib/brandclaw/orchestrator/persistence";
import type { AgentOutputContract } from "@/lib/brandclaw/orchestrator/types";
import { drainArtifacts, drainProposals } from "./run-collector";
import type { AgentArtifactDraft, AgentFinalizeResult } from "./types";

const GUARD_NOTE =
  "Run was truncated by a guard (wallclock timeout or max tool-calls) before completing normally.";

export const artifactOutputContract: AgentOutputContract<
  AgentArtifactDraft[],
  AgentFinalizeResult
> = {
  id: "agent-artifacts@1",
  parse(finalMessage) {
    // Lenient — onparseerbaar is géén throw: de status-beslissing (en de
    // bewaarde finalMessage) gebeurt in persist, zodat een parse-miss
    // debugbaar in de run-row landt i.p.v. als opaque exception.
    return extractArtifactDrafts(finalMessage);
  },
  async persist(parsed, { ctx, outcome, cost }) {
    // Server-owned output uit de run-collector (agents-motor-wiring):
    // deterministische artefacten van pipeline-tools (bv. het volledige
    // deep-research-rapport — loopt bewust niet door de model-context) en
    // mutation-proposals van write-tools (propose-only, ADR D6-verfijning).
    const serverDrafts = drainArtifacts(ctx.runId);
    const proposalDrafts: AgentArtifactDraft[] = drainProposals(ctx.runId).map((p) => ({
      type: "PROPOSAL",
      title: p.description.length > 120 ? `${p.description.slice(0, 117)}...` : p.description,
      content: {
        toolName: p.toolName,
        params: p.params,
        description: p.description,
        entityType: p.entityType,
        entityName: p.entityName ?? null,
        changes: p.changes ?? [],
      } as Record<string, unknown>,
    }));
    const allDrafts = [...parsed, ...serverDrafts, ...proposalDrafts];
    const hasProposals = proposalDrafts.length > 0;

    let status: AgentFinalizeResult["status"];
    let error: string | null = null;

    // Eerlijke oorzaak-rapportage: een AI-provider-fout is geen guard-truncatie.
    const abortNote =
      outcome.abortReason === "api_error"
        ? "Run was aborted by an AI-provider error before completing normally."
        : GUARD_NOTE;

    if (hasProposals) {
      // Voorgestelde mutaties wachten op user-goedkeuring via de confirm-
      // route; de run is pas afgerond ná die beslissing.
      status = "AWAITING_CONFIRMATION";
      error = outcome.truncated ? `${abortNote} Output may be partial.` : null;
    } else if (outcome.truncated && allDrafts.length === 0) {
      status = "FAILED";
      error = `${abortNote} No parseable output was produced.`;
    } else if (outcome.truncated) {
      status = "COMPLETED";
      error = `${abortNote} Output may be partial.`;
    } else if (allDrafts.length === 0 && outcome.finalMessage) {
      // Geen stille lege "succes"-run: het model produceerde wél tekst maar
      // geen parseable artifacts-blok — meestal een max_tokens-afkap of een
      // format-miss. Run blijft COMPLETED (0 artefacten is toegestaan) maar
      // de error legt uit waarom de inbox leeg is; finalMessage is bewaard.
      status = "COMPLETED";
      error =
        outcome.lastStopReason === "max_tokens"
          ? "Run hit the max-tokens output limit before completing its artifacts JSON — output was cut off. Raw output is preserved in finalMessage."
          : "Run completed but produced no parseable artifacts JSON block. Raw output is preserved in finalMessage.";
    } else {
      status = "COMPLETED";
    }

    // Individuele create-calls i.p.v. createMany: het response-contract
    // vereist artifactIds[] en createMany geeft geen ids terug. Blijft
    // één atomaire transactie samen met de run-finalize.
    const artifactCreates = allDrafts.map((draft) =>
      prisma.agentArtifact.create({
        data: {
          workspaceId: ctx.workspaceId,
          runId: ctx.runId,
          type: draft.type,
          title: draft.title,
          content: draft.content as Prisma.InputJsonValue,
          fidelityScore: draft.fidelityScore ?? null,
        },
      }),
    );

    const [, ...artifactRows] = await prisma.$transaction([
      prisma.agentRun.update({
        where: { id: ctx.runId },
        data: {
          status,
          toolCallTrace: serializeToolCallTrace(outcome.toolCallTrace),
          finalMessage: outcome.finalMessage,
          totalCostUsd: new Prisma.Decimal(cost.totalUsd),
          inputTokens: outcome.totalInputTokens,
          outputTokens: outcome.totalOutputTokens,
          latencyMs: outcome.latencyMs,
          truncated: outcome.truncated,
          error,
          completedAt: new Date(),
        },
      }),
      ...artifactCreates,
    ]);

    return {
      status,
      artifactIds: artifactRows.map((row) => row.id),
      error,
    };
  },
};

/**
 * Parse artifact-drafts uit de final agent-message. Verwacht een JSON-blok
 * (markdown-fenced of plain) met shape `{ "artifacts": [{ type, title,
 * content, fidelityScore? }] }`. Lenient: invalide items worden geskipt,
 * geen parseable JSON → lege array.
 */
export function extractArtifactDrafts(finalMessage: string | null): AgentArtifactDraft[] {
  if (!finalMessage) return [];
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
    !Array.isArray((parsed as { artifacts?: unknown }).artifacts)
  ) {
    return [];
  }

  const validTypes = new Set<string>(Object.values(AgentArtifactType));
  const drafts: AgentArtifactDraft[] = [];
  for (const item of (parsed as { artifacts: unknown[] }).artifacts) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const type = typeof raw.type === "string" ? raw.type.toUpperCase() : "";
    if (!validTypes.has(type)) continue;
    if (typeof raw.title !== "string" || raw.title.trim().length === 0) continue;
    if (!raw.content || typeof raw.content !== "object" || Array.isArray(raw.content)) continue;

    const fidelityScore =
      typeof raw.fidelityScore === "number" && Number.isFinite(raw.fidelityScore)
        ? Math.min(100, Math.max(0, raw.fidelityScore))
        : undefined;

    // knowledgeResourceId is een server-owned reserved key (write-back van de
    // accept-materialisatie) — strip hem uit model-output, anders kan een
    // hallucinerend/geïnjecteerd model via accept/dismiss een willekeurige
    // bestaande resource in de workspace (de)archiveren.
    const { knowledgeResourceId: _reserved, ...safeContent } = raw.content as Record<
      string,
      unknown
    >;
    void _reserved;

    drafts.push({
      type: type as AgentArtifactType,
      title: raw.title.trim(),
      content: safeContent,
      ...(fidelityScore !== undefined ? { fidelityScore } : {}),
    });
  }
  return drafts;
}
