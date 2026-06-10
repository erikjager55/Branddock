import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth-server';
import { resolveDeliverableWorkspaceId } from '@/lib/deliverable/deliverable-access';
import { z } from 'zod';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { trackEvent } from '@/lib/analytics/posthog';
import { emitLearningEvent } from '@/lib/learning-loop';

/**
 * Approval state transitions. SCHEDULED and PUBLISHED are terminal-ish but
 * reversible to DRAFT (e.g. user wants to unpublish or cancel a schedule).
 * SCHEDULED ↔ PUBLISHED is also allowed because the cron-job (future) flips
 * one to the other; manual flips via the UI mirror that.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['IN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED'],
  IN_REVIEW: ['APPROVED', 'CHANGES_REQUESTED', 'DRAFT'],
  CHANGES_REQUESTED: ['APPROVED', 'IN_REVIEW', 'DRAFT'],
  APPROVED: ['SCHEDULED', 'PUBLISHED', 'DRAFT'],
  SCHEDULED: ['PUBLISHED', 'APPROVED', 'DRAFT'],
  PUBLISHED: ['SCHEDULED', 'DRAFT'],
};

const approvalSchema = z.object({
  status: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'CHANGES_REQUESTED', 'SCHEDULED', 'PUBLISHED']),
  note: z.string().max(2000).optional(),
});

/** PATCH /api/studio/[deliverableId]/approval — Update approval status */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    // Resource-based: workspace van het deliverable i.p.v. cookie-gelijkheid
    // (zombie-tab fix — docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md).
    const workspaceId = await resolveDeliverableWorkspaceId((await params).deliverableId);
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await getServerSession();
    const userId = session?.user?.id ?? null;

    const { deliverableId } = await params;

    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: { campaign: { select: { workspaceId: true, id: true } } },
    });

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }
    if (deliverable.campaign.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = approvalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { status: newStatus, note } = parsed.data;
    const currentStatus = deliverable.approvalStatus ?? 'DRAFT';

    // Idempotent no-op: status already matches — just echo current state.
    if (currentStatus === newStatus) {
      return NextResponse.json({
        approvalStatus: deliverable.approvalStatus,
        approvalNote: deliverable.approvalNote,
        approvedBy: deliverable.approvedBy,
        approvedAt: deliverable.approvedAt,
        publishedAt: deliverable.publishedAt,
      });
    }

    // Validate state transition
    const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid transition: ${currentStatus} → ${newStatus}` },
        { status: 400 },
      );
    }

    // CHANGES_REQUESTED requires a note
    if (newStatus === 'CHANGES_REQUESTED' && (!note || !note.trim())) {
      return NextResponse.json(
        { error: 'A note is required when requesting changes' },
        { status: 400 },
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      approvalStatus: newStatus,
    };

    if (note !== undefined) {
      updateData.approvalNote = note;
    }

    if (newStatus === 'APPROVED') {
      updateData.approvedBy = userId;
      updateData.approvedAt = new Date();
    }

    // Reset approval fields when going back to DRAFT via CHANGES_REQUESTED → IN_REVIEW
    if (newStatus === 'IN_REVIEW' && currentStatus === 'CHANGES_REQUESTED') {
      // Keep the note for reference, clear approval info
      updateData.approvedBy = null;
      updateData.approvedAt = null;
    }

    const updated = await prisma.deliverable.update({
      where: { id: deliverableId },
      data: updateData,
    });

    // Cache invalidation
    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    void trackEvent({
      event: 'deliverable_approval_changed',
      userId,
      workspaceId,
      properties: {
        deliverable_id: updated.id,
        content_type: updated.contentType,
        previous_status: currentStatus,
        new_status: newStatus,
        quality_score: updated.qualityScore ?? null,
      },
    });

    // Learning Loop event emission (cat 9 — content lifecycle).
    // Use explicit literal types so TS can narrow the discriminated union.
    const lifecycleData = {
      deliverableId: updated.id,
      previousStatus: currentStatus,
      newStatus,
      reason: note,
    };
    if (newStatus === 'APPROVED') {
      void emitLearningEvent({ workspaceId, userId, payload: { type: 'content.approved', data: lifecycleData } });
    } else if (newStatus === 'CHANGES_REQUESTED') {
      void emitLearningEvent({ workspaceId, userId, payload: { type: 'content.rejected', data: lifecycleData } });
    } else if (newStatus === 'PUBLISHED') {
      void emitLearningEvent({ workspaceId, userId, payload: { type: 'content.published', data: lifecycleData } });
    }

    return NextResponse.json({
      deliverableId: updated.id,
      approvalStatus: updated.approvalStatus,
      approvalNote: updated.approvalNote,
      approvedBy: updated.approvedBy,
      approvedAt: updated.approvedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('[PATCH /api/studio/:id/approval]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
