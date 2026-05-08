import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { emitLearningEvent } from '@/lib/learning-loop';
import { getContentReadiness } from '@/lib/learning-loop/content-readiness';

/**
 * Override path for publish when the QA-gate (fidelity-score below threshold)
 * blocks the regular /publish route. Caller must supply a `reason` string
 * (10..500 chars) so analytics can later query why overrides happen.
 *
 * The event tag is `content.published` with `reason="override (score N): <text>"`
 * — same event type as a normal publish so timelines stay clean. Filtering
 * for overrides happens via the `reason` prefix.
 */
const overrideSchema = z.object({
  reason: z.string().trim().min(10).max(500),
  scheduledPublishDate: z.string().datetime().optional(),
  publishNow: z.boolean().optional(),
  publishedVia: z.string().trim().min(1).max(50).optional(),
});

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
    if (!deliverable) return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    if (deliverable.campaign.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = overrideSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { reason, scheduledPublishDate, publishNow, publishedVia } = parsed.data;

    // Capture the score we're overriding for the audit-trail. Failsafe-open
    // (no-version / no-score) means there's nothing to override — caller
    // should use the normal /publish route. Reject so we don't pollute the
    // override-rate metric with no-op overrides.
    const readiness = await getContentReadiness(deliverableId, workspaceId);
    if (readiness.canPublish) {
      return NextResponse.json(
        {
          error: 'Override not needed — content passes the gate. Use /publish.',
          reason: readiness.reason,
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const schedDate = scheduledPublishDate ? new Date(scheduledPublishDate) : null;
    const isFuture = schedDate !== null && schedDate.getTime() > now.getTime();

    let nextStatus: 'SCHEDULED' | 'PUBLISHED';
    let nextPublishedAt: Date | null;
    let nextScheduledDate: Date | null;
    if (publishNow === true || schedDate === null) {
      nextStatus = 'PUBLISHED';
      nextPublishedAt = now;
      nextScheduledDate = null;
    } else if (isFuture) {
      nextStatus = 'SCHEDULED';
      nextPublishedAt = null;
      nextScheduledDate = schedDate;
    } else {
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
        publishedVia: publishedVia ?? null,
        status: 'COMPLETED',
      },
    });

    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    if (nextStatus === 'PUBLISHED') {
      const session = await getServerSession();
      const scoreNum = readiness.latestScore?.compositeScore;
      const overrideTag =
        scoreNum !== undefined
          ? `override (score ${Math.round(scoreNum)}): ${reason}`
          : `override: ${reason}`;
      void emitLearningEvent({
        workspaceId,
        userId: session?.user?.id ?? null,
        payload: {
          type: 'content.published',
          data: {
            deliverableId: updated.id,
            previousStatus: deliverable.approvalStatus ?? 'DRAFT',
            newStatus: nextStatus,
            reason: overrideTag,
          },
        },
      });
    }

    return NextResponse.json({
      deliverableId: updated.id,
      approvalStatus: nextStatus,
      publishedAt: updated.publishedAt?.toISOString() ?? null,
      scheduledPublishDate: updated.scheduledPublishDate?.toISOString() ?? null,
      publishedVia: updated.publishedVia,
      override: {
        reason,
        compositeScoreAtOverride: readiness.latestScore?.compositeScore ?? null,
        threshold: readiness.latestScore?.threshold ?? null,
      },
    });
  } catch (error) {
    console.error('[POST /api/studio/:id/publish-with-override]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
