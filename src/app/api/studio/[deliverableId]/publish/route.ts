import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { z } from 'zod';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

/**
 * Body shape: either pass `scheduledPublishDate` for a future date (results in
 * SCHEDULED status) or `publishNow: true` (results in PUBLISHED status). A
 * past date counts as a backdated publish (PUBLISHED with publishedAt set to
 * that past date). Both fields optional → empty body defaults to publishNow.
 */
const publishSchema = z.object({
  scheduledPublishDate: z.string().datetime().optional(),
  publishNow: z.boolean().optional(),
});

/**
 * POST /api/studio/[deliverableId]/publish
 *
 * WordPress-style publish endpoint. The state machine:
 *
 *   - publishNow=true OR no date          → PUBLISHED, publishedAt=now
 *   - scheduledPublishDate in the future  → SCHEDULED, scheduledPublishDate set
 *   - scheduledPublishDate in the past    → PUBLISHED, publishedAt=that date (backdate)
 *
 * Idempotent: a SCHEDULED item can be re-scheduled (date updated) or
 * fast-tracked to PUBLISHED. Pre-conditions relaxed — any status except a
 * truly empty draft can publish (we keep the "must have content" check
 * implicit through the upstream UI).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

    const body = await request.json().catch(() => ({}));
    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { scheduledPublishDate, publishNow } = parsed.data;
    const now = new Date();
    const schedDate = scheduledPublishDate ? new Date(scheduledPublishDate) : null;
    const isFuture = schedDate !== null && schedDate.getTime() > now.getTime();

    // Resolve target status + timestamps from the body shape.
    let nextStatus: 'SCHEDULED' | 'PUBLISHED';
    let nextPublishedAt: Date | null;
    let nextScheduledDate: Date | null;

    if (publishNow === true || schedDate === null) {
      // Publish immediately — no future date provided.
      nextStatus = 'PUBLISHED';
      nextPublishedAt = now;
      nextScheduledDate = null;
    } else if (isFuture) {
      // Schedule for a future date — status SCHEDULED, no publishedAt yet.
      nextStatus = 'SCHEDULED';
      nextPublishedAt = null;
      nextScheduledDate = schedDate;
    } else {
      // Past date → backdated publish.
      nextStatus = 'PUBLISHED';
      nextPublishedAt = schedDate;
      nextScheduledDate = schedDate;
    }

    const updated = await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        approvalStatus: nextStatus,
        publishedAt: nextPublishedAt,
        scheduledPublishDate: nextScheduledDate,
        // Mark the deliverable as completed once it has a publish intent —
        // SCHEDULED items still count as completed work, just queued.
        status: 'COMPLETED',
      },
    });

    // Server-side cache invalidation. Client-side TanStack Query cache is
    // refreshed by the caller (Step4Timeline invalidates contentLibraryKeys
    // + campaignKeys after a successful response).
    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({
      deliverableId: updated.id,
      approvalStatus: nextStatus,
      publishedAt: updated.publishedAt?.toISOString() ?? null,
      scheduledPublishDate: updated.scheduledPublishDate?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('[POST /api/studio/:id/publish]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
