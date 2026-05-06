/**
 * Call-tracker — schrijft BrandContextSnapshot + AICallSnapshot +
 * AICallTrace voor elke gevolgde AI-call. Dedup op content-hash.
 *
 * Twee-call pattern:
 * 1. `trackAICallStart()` — vóór LLM-aanroep. Hash payload + context,
 *    upsert snapshots, create Trace. Return Trace-id.
 * 2. `trackAICallComplete()` — na LLM-completion. Update Trace met
 *    response-metadata.
 *
 * Cat 2 — leerlus-werkstroom sessie 2.
 *
 * NOG NIET GEWIRED in `withAi` middleware. Tijdens Phase 2 wordt
 * deze tracker aangeroepen vanuit middleware.ts en directe AI-callsites.
 */

import { prisma } from "@/lib/prisma";

import type {
  AICallPayload,
  AICallResponseMetadata,
  AICallSourceType,
} from "@/types/learning-loop";

import { hashContent } from "./snapshot-hasher";
import { emitLearningEvent } from "./event-emitter";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface TrackAICallStartInput {
  workspaceId: string;

  /**
   * Volledige BrandContextBlock zoals returned door getBrandContext().
   * Pass null voor calls zonder brand-context (bijv. system-utility AI calls).
   */
  brandContext: unknown | null;

  /** De call-payload die naar de LLM gaat. */
  payload: AICallPayload;

  /** Provenance — waar komt deze prompt vandaan? */
  sourceType: AICallSourceType;
  sourceIdentifier: string;
  gitSha?: string | null;

  /** Parent entity die deze call triggerde. Polymorf, geen FK-constraint. */
  parentEntityType: string;
  parentEntityId: string;

  /**
   * Voor multi-call paden (strategy-pipeline, tool-use-loops).
   * Single-call paden: 0.
   */
  callOrder?: number;
}

export interface TrackAICallStartResult {
  traceId: string;
  aiCallSnapshotId: string;
  brandContextSnapshotId: string | null;
}

export interface TrackAICallCompleteInput {
  traceId: string;
  responseMetadata: AICallResponseMetadata;
}

// ─────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────

/**
 * Vóór de LLM-aanroep — leg input + context vast.
 * Schrijft drie records (twee dedup, één nieuw):
 * 1. BrandContextSnapshot (upsert op contentHash) — als context provided
 * 2. AICallSnapshot (upsert op contentHash)
 * 3. AICallTrace (always new — een per call)
 *
 * Return waarden om door te geven aan parent-entity (bijv. set
 * `Deliverable.primaryCallTraceId = traceId`).
 */
export async function trackAICallStart(
  input: TrackAICallStartInput,
): Promise<TrackAICallStartResult> {
  const {
    workspaceId,
    brandContext,
    payload,
    sourceType,
    sourceIdentifier,
    gitSha,
    parentEntityType,
    parentEntityId,
    callOrder = 0,
  } = input;

  // 1. Brand-context snapshot (optional)
  const brandContextSnapshotId = brandContext
    ? await upsertBrandContextSnapshot(workspaceId, brandContext)
    : null;

  // 2. AI-call snapshot (always)
  const aiCallSnapshotId = await upsertAICallSnapshot(
    workspaceId,
    payload,
    sourceType,
    sourceIdentifier,
    gitSha ?? null,
  );

  // 3. Trace (always new)
  const trace = await prisma.aICallTrace.create({
    data: {
      workspaceId,
      aiCallSnapshotId,
      brandContextSnapshotId,
      parentEntityType,
      parentEntityId,
      callOrder,
      // responseMetadata starts empty — populated by trackAICallComplete
      responseMetadata: {},
    },
    select: { id: true },
  });

  // Auto-emit ai.call_started LearningEvent for unified event-log
  void emitLearningEvent({
    workspaceId,
    payload: {
      type: 'ai.call_started',
      data: {
        callTraceId: trace.id,
        aiCallSnapshotId,
        sourceIdentifier,
        parentEntityType,
        parentEntityId,
      },
    },
  });

  return {
    traceId: trace.id,
    aiCallSnapshotId,
    brandContextSnapshotId,
  };
}

/**
 * Na LLM-completion — update Trace met response-metadata + completedAt.
 *
 * Bij streaming: roep aan na `stream.finalMessage()`.
 * Bij errors: roep aan met `errorCode` + `errorMessage` in responseMetadata.
 */
export async function trackAICallComplete(
  input: TrackAICallCompleteInput,
): Promise<void> {
  const { traceId, responseMetadata } = input;

  const updated = await prisma.aICallTrace.update({
    where: { id: traceId },
    data: {
      responseMetadata: responseMetadata as object,
      completedAt: new Date(),
    },
    select: { workspaceId: true },
  });

  // Auto-emit ai.call_completed or ai.call_failed for unified event-log
  if (responseMetadata.errorCode) {
    void emitLearningEvent({
      workspaceId: updated.workspaceId,
      payload: {
        type: 'ai.call_failed',
        data: {
          callTraceId: traceId,
          errorCode: responseMetadata.errorCode,
          errorMessage: responseMetadata.errorMessage ?? 'Unknown error',
        },
      },
    });
  } else {
    void emitLearningEvent({
      workspaceId: updated.workspaceId,
      payload: {
        type: 'ai.call_completed',
        data: {
          callTraceId: traceId,
          latencyMs: responseMetadata.latencyMs,
          inputTokens: responseMetadata.inputTokens,
          outputTokens: responseMetadata.outputTokens,
          stopReason: responseMetadata.stopReason,
        },
      },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Internals — dedup helpers
// ─────────────────────────────────────────────────────────────────────────

async function upsertBrandContextSnapshot(
  workspaceId: string,
  brandContext: unknown,
): Promise<string> {
  const contentHash = hashContent(brandContext);

  // Try find first (read is cheap, write only if needed)
  const existing = await prisma.brandContextSnapshot.findUnique({
    where: { workspaceId_contentHash: { workspaceId, contentHash } },
    select: { id: true },
  });
  if (existing) return existing.id;

  // Race-condition safe upsert via createMany + skipDuplicates,
  // then re-read. Or simpler: try create, fallback to read on unique-violation.
  try {
    const created = await prisma.brandContextSnapshot.create({
      data: {
        workspaceId,
        contentHash,
        content: brandContext as object,
      },
      select: { id: true },
    });
    return created.id;
  } catch {
    // Concurrent write won — re-read
    const found = await prisma.brandContextSnapshot.findUnique({
      where: { workspaceId_contentHash: { workspaceId, contentHash } },
      select: { id: true },
    });
    if (!found) throw new Error("BrandContextSnapshot upsert failed");
    return found.id;
  }
}

async function upsertAICallSnapshot(
  workspaceId: string,
  payload: AICallPayload,
  sourceType: AICallSourceType,
  sourceIdentifier: string,
  gitSha: string | null,
): Promise<string> {
  const contentHash = hashContent(payload);

  const existing = await prisma.aICallSnapshot.findUnique({
    where: { workspaceId_contentHash: { workspaceId, contentHash } },
    select: { id: true },
  });
  if (existing) return existing.id;

  try {
    const created = await prisma.aICallSnapshot.create({
      data: {
        workspaceId,
        contentHash,
        payload: payload as object,
        sourceType,
        sourceIdentifier,
        gitSha,
      },
      select: { id: true },
    });
    return created.id;
  } catch {
    const found = await prisma.aICallSnapshot.findUnique({
      where: { workspaceId_contentHash: { workspaceId, contentHash } },
      select: { id: true },
    });
    if (!found) throw new Error("AICallSnapshot upsert failed");
    return found.id;
  }
}
