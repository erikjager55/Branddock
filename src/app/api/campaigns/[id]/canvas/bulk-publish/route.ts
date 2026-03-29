import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { z } from 'zod';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

const bulkPublishSchema = z.object({
  deliverableIds: z.array(z.string().min(1)).min(1).max(100),
  scheduledPublishDate: z.string().optional(),
});

/** POST /api/campaigns/[id]/canvas/bulk-publish */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: campaignId } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
    });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const body = await request.json();
    const parsed = bulkPublishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { deliverableIds, scheduledPublishDate } = parsed.data;

    const deliverables = await prisma.deliverable.findMany({
      where: { id: { in: deliverableIds }, campaignId },
      select: { id: true, approvalStatus: true },
    });

    const results: Array<{ id: string; success: boolean; publishedAt?: string; error?: string }> = [];

    for (const d of deliverables) {
      const currentStatus = d.approvalStatus ?? 'DRAFT';

      if (currentStatus !== 'APPROVED') {
        results.push({
          id: d.id,
          success: false,
          error: `Cannot publish: status is ${currentStatus} (must be APPROVED)`,
        });
        continue;
      }

      const now = new Date();
      await prisma.deliverable.update({
        where: { id: d.id },
        data: {
          approvalStatus: 'PUBLISHED',
          publishedAt: now,
          ...(scheduledPublishDate ? { scheduledPublishDate } : {}),
        },
      });

      results.push({ id: d.id, success: true, publishedAt: now.toISOString() });
    }

    const foundIds = new Set(deliverables.map((d) => d.id));
    for (const id of deliverableIds) {
      if (!foundIds.has(id)) {
        results.push({ id, success: false, error: 'Deliverable not found in campaign' });
      }
    }

    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[POST /api/campaigns/:id/canvas/bulk-publish]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
