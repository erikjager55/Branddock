// =============================================================
// POST /api/campaigns/[id]/deliverables/[did]/send
//
// Kicks off a Campaign Send for an approved email deliverable.
// Recipients are supplied as an inline list (MVP) — audience-id
// support is wired through but not exercised by the UI yet.
//
// MVP semantics: send synchronously in a loop against Emailit's
// POST /emails for each recipient. Capped at 500 recipients per
// send to keep the request under Next.js's route timeout. Larger
// lists should wait for the BullMQ job queue (Fase 4.4).
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { sendTransactional } from '@/lib/email/transactional';
import { isEmailitConfigured } from '@/lib/email/emailit-client';
import type { CampaignSendStatus } from '@prisma/client';

const MAX_INLINE_RECIPIENTS = 500;

const sendSchema = z.object({
  recipientEmails: z
    .array(z.string().email())
    .min(1, 'At least one recipient is required')
    .max(MAX_INLINE_RECIPIENTS, `At most ${MAX_INLINE_RECIPIENTS} recipients per send (use an Emailit audience for larger lists)`),
  subject: z.string().trim().min(1).max(300).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; did: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isEmailitConfigured()) {
      return NextResponse.json(
        { error: 'Emailit is not configured — set EMAILIT_API_KEY before sending campaigns.' },
        { status: 503 },
      );
    }

    const { id: campaignId, did: deliverableId } = await params;

    const body = await request.json().catch(() => ({}));
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Ownership + state checks
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: { campaign: { select: { id: true, workspaceId: true } } },
    });
    if (!deliverable || deliverable.campaignId !== campaignId) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }
    if (deliverable.campaign.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Require email deliverable + approved/published content
    const isEmailContentType = deliverable.contentType.toLowerCase().includes('email');
    if (!isEmailContentType) {
      return NextResponse.json(
        { error: 'Only email deliverables can be sent as campaigns' },
        { status: 400 },
      );
    }
    if (!['APPROVED', 'PUBLISHED'].includes(deliverable.approvalStatus)) {
      return NextResponse.json(
        { error: 'Deliverable must be approved before sending' },
        { status: 409 },
      );
    }
    if (!deliverable.generatedText?.trim()) {
      return NextResponse.json(
        { error: 'Deliverable has no generated content to send' },
        { status: 409 },
      );
    }

    // Guard against concurrent / duplicate sends on the same deliverable
    const activeSend = await prisma.campaignSend.findFirst({
      where: {
        deliverableId,
        status: { in: ['QUEUED', 'SENDING'] as CampaignSendStatus[] },
      },
      select: { id: true, status: true },
    });
    if (activeSend) {
      return NextResponse.json(
        { error: `A send is already ${activeSend.status.toLowerCase()} for this deliverable`, sendId: activeSend.id },
        { status: 409 },
      );
    }

    // De-dupe + normalise recipients
    const recipients = Array.from(
      new Set(parsed.data.recipientEmails.map((e) => e.trim().toLowerCase()).filter(Boolean)),
    );
    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No valid recipients after de-duplication' }, { status: 400 });
    }

    const subject = parsed.data.subject ?? deliverable.title;
    const htmlBody = deliverable.generatedText;

    // Create the send record upfront so the UI has something to poll.
    const campaignSend = await prisma.campaignSend.create({
      data: {
        deliverableId,
        workspaceId,
        status: 'SENDING',
        subject,
        recipientEmails: recipients,
        recipientCount: recipients.length,
        sentById: session.user.id,
        startedAt: new Date(),
      },
    });

    // Fire sends sequentially. Each success appends its emailId;
    // failures increment failedCount so the final aggregate is honest
    // even if half the list bounced mid-loop.
    const sendIds: string[] = [];
    let failed = 0;

    for (const recipient of recipients) {
      try {
        const result = await sendTransactional({
          to: recipient,
          subject,
          html: htmlBody,
          tags: {
            kind: 'campaign',
            campaign_send_id: campaignSend.id,
            deliverable_id: deliverableId,
          },
        });
        sendIds.push(result.id);
      } catch (err) {
        failed += 1;
        console.error(`[campaign-send ${campaignSend.id}] ${recipient} failed:`, err);
      }
    }

    const finalStatus: CampaignSendStatus =
      failed === recipients.length
        ? 'FAILED'
        : failed > 0
          ? 'PARTIAL'
          : 'COMPLETED';

    const updated = await prisma.campaignSend.update({
      where: { id: campaignSend.id },
      data: {
        emailitSendIds: sendIds,
        failedCount: failed,
        status: finalStatus,
        completedAt: new Date(),
        errorMessage: failed > 0 ? `${failed}/${recipients.length} recipients failed at submit time` : null,
      },
    });

    return NextResponse.json({
      send: {
        id: updated.id,
        status: updated.status,
        recipientCount: updated.recipientCount,
        acceptedCount: sendIds.length,
        failedCount: updated.failedCount,
        startedAt: updated.startedAt?.toISOString() ?? null,
        completedAt: updated.completedAt?.toISOString() ?? null,
      },
    }, { status: 202 });
  } catch (error) {
    console.error('[POST /api/campaigns/:id/deliverables/:did/send]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
