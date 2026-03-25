import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { z } from 'zod';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

const publishSchema = z.object({
  scheduledPublishDate: z.string().datetime().optional(),
});

/** POST /api/studio/[deliverableId]/publish — Publish approved content */
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

    // Must be APPROVED to publish
    if (deliverable.approvalStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: `Cannot publish: current status is ${deliverable.approvalStatus ?? 'DRAFT'}, must be APPROVED` },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { scheduledPublishDate } = parsed.data;

    // Validate scheduled date is in the future if provided
    if (scheduledPublishDate) {
      const schedDate = new Date(scheduledPublishDate);
      if (schedDate <= new Date()) {
        return NextResponse.json(
          { error: 'Scheduled publish date must be in the future' },
          { status: 400 },
        );
      }
    }

    const now = new Date();
    const updated = await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        approvalStatus: 'PUBLISHED',
        publishedAt: now,
        ...(scheduledPublishDate && { scheduledPublishDate: new Date(scheduledPublishDate) }),
        status: 'COMPLETED',
      },
    });

    // Cache invalidation
    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({
      deliverableId: updated.id,
      publishedAt: updated.publishedAt?.toISOString() ?? now.toISOString(),
      approvalStatus: 'PUBLISHED',
      scheduledPublishDate: updated.scheduledPublishDate?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('[POST /api/studio/:id/publish]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
