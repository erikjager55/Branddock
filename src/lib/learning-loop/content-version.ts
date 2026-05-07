/**
 * ContentVersion CRUD helpers — Cat 2/4/6 leerlus-werkstroom.
 *
 * Functions:
 * - buildDeliverableSnapshot: assembleer full deliverable + components shape
 * - createContentVersion: persist nieuwe versie (auto-increment, diff voor USER, fidelity-trigger optie)
 * - restoreContentVersion: apply oude snapshot, creëer nieuwe USER-version
 *
 * Schema-design uit `branddock-learning-loop-decisions.md` beslissing 4:
 * - AI-versies: createdBy='AI', primaryCallTraceId gezet, alle 4 diff-velden NULL
 * - USER-versies: createdBy='USER', editorUserId gezet, diffFromPrevious + diffSummary +
 *   editType populated via buildDiff + classifyEdit
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { ContentVersion } from '@prisma/client';
import { buildDiff } from './diff-builder';
import { classifyEdit } from './edit-classifier';

const VERSION_NUMBER_MAX_RETRIES = 3;

export interface DeliverableSnapshot {
  deliverableId: string;
  title: string;
  contentType: string | null;
  settings: unknown;
  pipelineStatus: string | null;
  components: Array<{
    id: string;
    componentType: string;
    order: number;
    status: string;
    generatedContent: string | null;
    imageUrl: string | null;
    cascadingContext: string | null;
    promptUsed: string | null;
    aiModel: string | null;
    aiProvider: string | null;
    version: number;
  }>;
}

/**
 * Load full deliverable + components from DB into a snapshot shape suitable
 * for ContentVersion.contentSnapshot.
 */
export async function buildDeliverableSnapshot(
  deliverableId: string,
): Promise<DeliverableSnapshot> {
  const deliverable = await prisma.deliverable.findUniqueOrThrow({
    where: { id: deliverableId },
    select: {
      id: true,
      title: true,
      contentType: true,
      settings: true,
      pipelineStatus: true,
      components: {
        select: {
          id: true,
          componentType: true,
          order: true,
          status: true,
          generatedContent: true,
          imageUrl: true,
          cascadingContext: true,
          promptUsed: true,
          aiModel: true,
          aiProvider: true,
          version: true,
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  return {
    deliverableId: deliverable.id,
    title: deliverable.title,
    contentType: deliverable.contentType,
    settings: deliverable.settings,
    pipelineStatus: deliverable.pipelineStatus,
    components: deliverable.components,
  };
}

export type ContentVersionCreatedBy = 'AI' | 'USER';

export interface CreateContentVersionInput {
  deliverableId: string;
  workspaceId: string;
  createdBy: ContentVersionCreatedBy;
  /** AI-call provenance (only set when createdBy='AI'). */
  primaryCallTraceId?: string;
  /** User who performed the edit (only set when createdBy='USER'). */
  editorUserId?: string;
  /**
   * Override the default snapshot (full deliverable+components from DB).
   * Used by `restoreContentVersion` to write the restored snapshot exactly.
   */
  snapshotOverride?: Record<string, unknown>;
}

/**
 * Create a ContentVersion. Auto-increments versionNumber per deliverable
 * (retries on unique-constraint races up to 3x). For USER edits, computes
 * diff vs previous version + classifies editType heuristically.
 */
export async function createContentVersion(
  input: CreateContentVersionInput,
): Promise<ContentVersion> {
  const { deliverableId, workspaceId, createdBy, primaryCallTraceId, editorUserId, snapshotOverride } = input;

  // Verify deliverable belongs to this workspace
  const deliverable = await prisma.deliverable.findFirst({
    where: { id: deliverableId, campaign: { workspaceId } },
    select: { id: true },
  });
  if (!deliverable) {
    throw new Error(`Deliverable ${deliverableId} not found in workspace ${workspaceId}`);
  }

  const snapshot =
    snapshotOverride ??
    ((await buildDeliverableSnapshot(deliverableId)) as unknown as Record<string, unknown>);

  for (let attempt = 0; attempt < VERSION_NUMBER_MAX_RETRIES; attempt++) {
    const previous = await prisma.contentVersion.findFirst({
      where: { deliverableId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true, contentSnapshot: true },
    });

    const nextVersionNumber = (previous?.versionNumber ?? 0) + 1;

    let diffFromPrevious: unknown = null;
    let diffSummary: unknown = null;
    let editType: string | null = null;

    if (createdBy === 'USER' && previous?.contentSnapshot) {
      try {
        const beforeText = snapshotToText(previous.contentSnapshot as unknown as DeliverableSnapshot);
        const afterText = snapshotToText(snapshot as unknown as DeliverableSnapshot);
        const diffResult = buildDiff(beforeText, afterText);
        diffFromPrevious = diffResult.entries;
        diffSummary = diffResult.summary;
        editType = classifyEdit(diffResult.summary);
      } catch (err) {
        console.warn(`[createContentVersion] diff computation failed:`, err);
      }
    }

    try {
      return await prisma.contentVersion.create({
        data: {
          deliverableId,
          versionNumber: nextVersionNumber,
          contentSnapshot: snapshot as unknown as Prisma.InputJsonValue,
          createdBy,
          primaryCallTraceId: createdBy === 'AI' ? primaryCallTraceId ?? null : null,
          editorUserId: createdBy === 'USER' ? editorUserId ?? null : null,
          diffFromPrevious: diffFromPrevious
            ? (diffFromPrevious as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          diffSummary: diffSummary
            ? (diffSummary as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          editType,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        attempt < VERSION_NUMBER_MAX_RETRIES - 1
      ) {
        // Unique constraint on (deliverableId, versionNumber) — race with
        // a concurrent create. Re-read max versionNumber and retry.
        continue;
      }
      throw err;
    }
  }

  throw new Error(
    `[createContentVersion] versionNumber race not resolved after ${VERSION_NUMBER_MAX_RETRIES} attempts`,
  );
}

/**
 * Flatten a deliverable snapshot into a single text blob suitable for
 * paragraph-level diffing. Joins component-content with a sentinel so
 * paragraph-boundaries are preserved across component boundaries.
 */
function snapshotToText(snapshot: DeliverableSnapshot): string {
  if (!snapshot.components || !Array.isArray(snapshot.components)) return '';
  return snapshot.components
    .map((c) => `[${c.componentType}]\n${c.generatedContent ?? ''}`)
    .join('\n\n');
}

/**
 * Restore deliverable + components to the state captured in `versionId`.
 * Creates a new USER-version recording the restore action; old versions are
 * preserved (no mutate-in-place — full audit trail).
 */
export async function restoreContentVersion(
  versionId: string,
  workspaceId: string,
  editorUserId: string,
): Promise<ContentVersion> {
  const version = await prisma.contentVersion.findFirst({
    where: { id: versionId, deliverable: { campaign: { workspaceId } } },
    include: { deliverable: { select: { id: true } } },
  });
  if (!version) {
    throw new Error(`ContentVersion ${versionId} not found in workspace ${workspaceId}`);
  }

  const snapshot = version.contentSnapshot as unknown as DeliverableSnapshot;
  if (!snapshot.components || !Array.isArray(snapshot.components)) {
    throw new Error(`ContentVersion ${versionId} has malformed snapshot — cannot restore`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.deliverable.update({
      where: { id: version.deliverableId },
      data: {
        title: snapshot.title,
        // contentType is immutable in normal flow — skip unless explicitly different
        settings: (snapshot.settings ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });

    // Per-component update with graceful skip on P2025 (component deleted
    // since the snapshot was taken). Log so the operator notices if a restore
    // is partial. A more aggressive policy (delete-extras / recreate-missing)
    // would alter user data more than necessary — best-effort revert is safer.
    for (const c of snapshot.components) {
      try {
        await tx.deliverableComponent.update({
          where: { id: c.id },
          data: {
            generatedContent: c.generatedContent,
            imageUrl: c.imageUrl,
            cascadingContext: c.cascadingContext,
            promptUsed: c.promptUsed,
            aiModel: c.aiModel,
            aiProvider: c.aiProvider,
            status: 'GENERATED',
          },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2025'
        ) {
          console.warn(
            `[restoreContentVersion] component ${c.id} no longer exists — skipped (best-effort restore)`,
          );
          continue;
        }
        throw err;
      }
    }
  });

  return createContentVersion({
    deliverableId: version.deliverableId,
    workspaceId,
    createdBy: 'USER',
    editorUserId,
    snapshotOverride: snapshot as unknown as Record<string, unknown>,
  });
}
