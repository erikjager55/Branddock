import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { z } from 'zod';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['IN_REVIEW'],
  IN_REVIEW: ['APPROVED', 'CHANGES_REQUESTED'],
  CHANGES_REQUESTED: ['IN_REVIEW'],
  APPROVED: ['PUBLISHED'],
  PUBLISHED: [],
};

const approvalSchema = z.object({
  status: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'CHANGES_REQUESTED', 'PUBLISHED']),
  note: z.string().max(2000).optional(),
});

/** PATCH /api/studio/[deliverableId]/approval — Update approval status */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
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
