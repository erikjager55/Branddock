// =============================================================
// Emailit webhook receiver (4.2)
//
// Emailit POSTs delivery / bounce / open / click / complaint /
// unsubscribe events here. We verify HMAC-SHA256, auto-suppress
// bounced + complained addresses, and log for observability.
//
// Per-campaign stats persistence is intentionally deferred to
// step 4 (Canvas send campaign) when the CampaignSend model
// is introduced.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { normaliseWebhookEvent, verifyEmailitSignature } from '@/lib/email/webhook-handler';
import { suppress } from '@/lib/email/suppressions';
import { prisma } from '@/lib/prisma';
import type { EmailitEventType } from '@/lib/email/types';

/** Which CampaignSend counter a given event type should increment. */
const EVENT_COUNTER_FIELD: Record<EmailitEventType, string | null> = {
  delivered: 'deliveredCount',
  opened: 'openedCount',
  clicked: 'clickedCount',
  bounced: 'bouncedCount',
  complained: 'complainedCount',
  unsubscribed: 'unsubscribedCount',
  failed: 'failedCount',
};

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!verifyEmailitSignature(rawBody, request.headers)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Emailit may batch multiple events in one delivery.
  const events = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.events)
      ? (payload.events as Record<string, unknown>[])
      : [payload];

  for (const raw of events) {
    const event = normaliseWebhookEvent(raw);
    if (!event) {
      console.warn('[email-webhook] skipped unknown event', raw);
      continue;
    }

    console.info(`[email-webhook] ${event.type} ${event.recipient} emailId=${event.emailId}`);

    if (event.type === 'bounced' || event.type === 'complained') {
      try {
        await suppress(event.recipient, event.type === 'bounced' ? 'BOUNCE' : 'COMPLAINT');
      } catch (err) {
        console.error('[email-webhook] suppress failed:', err);
      }
    }

    // Correlate to an active CampaignSend via emailitSendIds and bump
    // the matching counter atomically. No-op when the emailId belongs
    // to a non-campaign transactional (invite, reset, verify).
    const counterField = EVENT_COUNTER_FIELD[event.type];
    if (counterField) {
      try {
        const campaignSend = await prisma.campaignSend.findFirst({
          where: { emailitSendIds: { has: event.emailId } },
          select: { id: true },
        });
        if (campaignSend) {
          await prisma.campaignSend.update({
            where: { id: campaignSend.id },
            data: { [counterField]: { increment: 1 } },
          });
        }
      } catch (err) {
        console.error('[email-webhook] campaign-send stats update failed:', err);
      }
    }
  }

  return NextResponse.json({ ok: true, processed: events.length });
}
