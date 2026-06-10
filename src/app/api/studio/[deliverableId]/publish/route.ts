import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth-server';
import { resolveDeliverableWorkspaceId } from '@/lib/deliverable/deliverable-access';
import { z } from 'zod';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { emitLearningEvent } from '@/lib/learning-loop';
import { getContentReadiness } from '@/lib/learning-loop/content-readiness';

/**
 * Body shape: either pass `scheduledPublishDate` for a future date (results in
 * SCHEDULED status) or `publishNow: true` (results in PUBLISHED status). A
 * past date counts as a backdated publish (PUBLISHED with publishedAt set to
 * that past date). Both fields optional → empty body defaults to publishNow.
 *
 * Distribution is independent: `publishedVia` carries the channel platform
 * (e.g. "linkedin") when the publish was triggered via a connected channel.
 * Omitted (or empty) means manual / local-only — the user marked it as
 * published in Branddock and distributes externally themselves.
 */
const publishSchema = z.object({
  scheduledPublishDate: z.string().datetime().optional(),
  publishNow: z.boolean().optional(),
  publishedVia: z.string().trim().min(1).max(50).optional(),
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
    // Resource-based: workspace van het deliverable i.p.v. cookie-gelijkheid
    // (zombie-tab fix — docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md).
    const workspaceId = await resolveDeliverableWorkspaceId((await params).deliverableId);
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

    const { scheduledPublishDate, publishNow, publishedVia } = parsed.data;

    // QA-gate: block publish when the latest fidelity-score is below the
    // type-specific compositeThreshold. Failsafe-open (no version / no score
    // yet) lets the publish proceed so missing-data doesn't brick the route.
    // For overrides, callers must use POST /publish-with-override.
    const readiness = await getContentReadiness(deliverableId, workspaceId);
    if (!readiness.canPublish) {
      return NextResponse.json(
        {
          error: 'Content not ready for publish',
          reason: readiness.reason,
          score: readiness.latestScore,
          overrideEndpoint: `/api/studio/${deliverableId}/publish-with-override`,
        },
        { status: 422 },
      );
    }

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
        // Distribution channel — null when the user used the local "Publish
        // now" button without a connected channel. Channel-publish routes
        // pass the platform string explicitly.
        publishedVia: publishedVia ?? null,
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

    // Learning Loop event emission (cat 9 — content lifecycle).
    // Only emit on actual PUBLISHED transitions; SCHEDULED is ambient state.
    if (nextStatus === 'PUBLISHED') {
      const session = await getServerSession();
      void emitLearningEvent({
        workspaceId,
        userId: session?.user?.id ?? null,
        payload: {
          type: 'content.published',
          data: {
            deliverableId: updated.id,
            previousStatus: deliverable.approvalStatus ?? 'DRAFT',
            newStatus: nextStatus,
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
    });
  } catch (error) {
    console.error('[POST /api/studio/:id/publish]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
