/**
 * LearningEvent emitter — type-safe wrapper around prisma.learningEvent.create
 *
 * Cat 9 — leerlus-werkstroom sessie 2. Centrale plek voor het emitten
 * van events. Wordt aangeroepen vanuit API-routes na een gecommitteerde
 * actie. Sync writes (geen async queue voor pre-launch).
 *
 * Bij failure (DB-error): we log en swallow. Een event-emit-failure
 * mag de eigenlijke action niet laten falen — het is observability,
 * geen kritiek pad.
 */

import { prisma } from "@/lib/prisma";

import type { LearningEventPayload } from "@/types/learning-loop";

export interface EmitEventInput {
  workspaceId: string;
  userId?: string | null;
  payload: LearningEventPayload;
  /** Optionele timestamp-override. Default = now. */
  timestamp?: Date;
}

/**
 * Emit een LearningEvent. Type-safe via discriminated union.
 *
 * Parent-entity-info wordt afgeleid uit de payload waar mogelijk;
 * fallback velden via expliciete `entityType` + `entityId` als
 * de payload-shape ze niet bevat.
 */
export async function emitLearningEvent(
  input: EmitEventInput,
): Promise<void> {
  const { workspaceId, userId, payload, timestamp } = input;
  const { entityType, entityId } = inferEntity(payload);

  try {
    await prisma.learningEvent.create({
      data: {
        workspaceId,
        userId: userId ?? null,
        eventType: payload.type,
        entityType,
        entityId,
        data: payload.data as object,
        timestamp: timestamp ?? new Date(),
      },
    });
  } catch (err) {
    // Observability failure — log, do not throw.
    // Event-emit must not break the user action.
    console.error("[LearningEvent] emit failed:", {
      eventType: payload.type,
      workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Bulk-emit. Wraps multiple events in one DB-call where possible.
 * Used voor batch-flows (e.g., "campaign launch" → multiple deliverables created).
 */
export async function emitLearningEvents(
  events: EmitEventInput[],
): Promise<void> {
  if (events.length === 0) return;

  const records = events.map((e) => {
    const { entityType, entityId } = inferEntity(e.payload);
    return {
      workspaceId: e.workspaceId,
      userId: e.userId ?? null,
      eventType: e.payload.type,
      entityType,
      entityId,
      data: e.payload.data as object,
      timestamp: e.timestamp ?? new Date(),
    };
  });

  try {
    await prisma.learningEvent.createMany({ data: records });
  } catch (err) {
    console.error("[LearningEvent] batch emit failed:", {
      count: events.length,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────────

interface EntityRef {
  entityType: string;
  entityId: string;
}

/**
 * Leid de primary entity-reference af uit de event-payload.
 * Mapping is event-type-specifiek; fallback naar generieke "system".
 */
function inferEntity(payload: LearningEventPayload): EntityRef {
  switch (payload.type) {
    case "content.created":
    case "content.regenerated":
    case "content.edited":
      return {
        entityType: "ContentVersion",
        entityId: payload.data.contentVersionId,
      };
    case "content.approved":
    case "content.rejected":
    case "content.published":
    case "content.archived":
      return {
        entityType: "Deliverable",
        entityId: payload.data.deliverableId,
      };
    case "ai.call_started":
    case "ai.call_completed":
    case "ai.call_failed":
      return {
        entityType: "AICallTrace",
        entityId: payload.data.callTraceId,
      };
    case "fidelity.scored":
      return {
        entityType: "ContentFidelityScore",
        entityId: payload.data.scoreId,
      };
    case "fidelity.threshold_crossed":
      return {
        entityType: "ContentVersion",
        entityId: payload.data.contentVersionId,
      };
    case "suggestion.accepted":
    case "suggestion.dismissed":
    case "suggestion.previewed":
      return {
        entityType: "ImproveSuggestion",
        entityId: payload.data.suggestionId,
      };
    case "alignment.issue_dismissed":
    case "alignment.fix_applied":
      return {
        entityType: "AlignmentIssue",
        entityId: payload.data.issueId,
      };
    case "prompt.template_changed":
      return {
        entityType: "AICallSnapshot",
        entityId: payload.data.sourceIdentifier,
      };
    case "config.exploration_updated":
      return {
        entityType: "ExplorationConfig",
        entityId: payload.data.configId,
      };
  }
}
