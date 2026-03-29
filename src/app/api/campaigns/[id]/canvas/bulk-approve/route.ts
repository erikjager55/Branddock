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

const bulkApproveSchema = z.object({
  deliverableIds: z.array(z.string().min(1)).min(1).max(100),
  action: z.enum(['submit', 'approve', 'request-changes']),
  note: z.string().max(2000).optional(),
});

const ACTION_TO_STATUS: Record<string, string> = {
  submit: 'IN_REVIEW',
  approve: 'APPROVED',
  'request-changes': 'CHANGES_REQUESTED',
};

/** POST /api/campaigns/[id]/canvas/bulk-approve */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await getServerSession();
    const userId = session?.user?.id ?? null;

    const { id: campaignId } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
    });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const body = await request.json();
    const parsed = bulkApproveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { deliverableIds, action, note } = parsed.data;
    const targetStatus = ACTION_TO_STATUS[action];

    if (action === 'request-changes' && (!note || !note.trim())) {
      return NextResponse.json(
        { error: 'A note is required when requesting changes' },
        { status: 400 },
      );
    }

    const deliverables = await prisma.deliverable.findMany({
      where: { id: { in: deliverableIds }, campaignId },
      select: { id: true, approvalStatus: true },
    });

    const results: Array<{ id: string; success: boolean; newStatus?: string; error?: string }> = [];

    for (const d of deliverables) {
      const currentStatus = d.approvalStatus ?? 'DRAFT';
      const allowed = VALID_TRANSITIONS[currentStatus] ?? [];

      if (!allowed.includes(targetStatus)) {
        results.push({
          id: d.id,
          success: false,
          error: `Invalid transition: ${currentStatus} → ${targetStatus}`,
        });
        continue;
      }

      const updateData: Record<string, unknown> = {
        approvalStatus: targetStatus,
      };

      if (note !== undefined) {
        updateData.approvalNote = note;
      }

      if (targetStatus === 'APPROVED') {
        updateData.approvedBy = userId;
        updateData.approvedAt = new Date();
      }

      if (targetStatus === 'IN_REVIEW' && currentStatus === 'CHANGES_REQUESTED') {
        updateData.approvedBy = null;
        updateData.approvedAt = null;
      }

      await prisma.deliverable.update({
        where: { id: d.id },
        data: updateData,
      });

      results.push({ id: d.id, success: true, newStatus: targetStatus });
    }

    // Include IDs not found in the campaign
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
    console.error('[POST /api/campaigns/:id/canvas/bulk-approve]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
