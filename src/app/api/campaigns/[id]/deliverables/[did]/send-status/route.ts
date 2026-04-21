// =============================================================
// GET /api/campaigns/[id]/deliverables/[did]/send-status
//
// Returns the latest CampaignSend for a deliverable (or the one
// matching ?sendId=). UI polls this to update delivery stats as
// Emailit webhook events arrive.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; did: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const { id: campaignId, did: deliverableId } = await params;
    const sendId = request.nextUrl.searchParams.get('sendId');

    // Verify the deliverable belongs to this workspace's campaign
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      select: { campaignId: true, campaign: { select: { workspaceId: true } } },
    });
    if (!deliverable || deliverable.campaignId !== campaignId) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }
    if (deliverable.campaign.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const send = sendId
      ? await prisma.campaignSend.findFirst({
          where: { id: sendId, deliverableId, workspaceId },
        })
      : await prisma.campaignSend.findFirst({
          where: { deliverableId, workspaceId },
          orderBy: { createdAt: 'desc' },
        });

    if (!send) {
      return NextResponse.json({ send: null });
    }

    return NextResponse.json({
      send: {
        id: send.id,
        status: send.status,
        subject: send.subject,
        recipientCount: send.recipientCount,
        deliveredCount: send.deliveredCount,
        openedCount: send.openedCount,
        clickedCount: send.clickedCount,
        bouncedCount: send.bouncedCount,
        complainedCount: send.complainedCount,
        unsubscribedCount: send.unsubscribedCount,
        failedCount: send.failedCount,
        errorMessage: send.errorMessage,
        startedAt: send.startedAt?.toISOString() ?? null,
        completedAt: send.completedAt?.toISOString() ?? null,
        scheduledAt: send.scheduledAt?.toISOString() ?? null,
        createdAt: send.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[GET /api/campaigns/:id/deliverables/:did/send-status]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
