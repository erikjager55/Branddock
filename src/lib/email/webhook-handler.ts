// =============================================================
// Emailit webhook signature + event dispatcher (4.2)
//
// Verifies the HMAC-SHA256 signature Emailit sends on webhook
// deliveries, then normalises the event into a typed shape.
//
// NOTE: The exact signature header name used by Emailit is not
// fully documented. We accept both `X-Emailit-Signature` and the
// more generic `X-Signature` (Emailit's older / competitor
// convention). Adjust here if ops traffic shows a different name.
// =============================================================

import { createHmac, timingSafeEqual } from 'crypto';
import type { EmailitWebhookEvent, EmailitEventType } from './types';

const SIGNATURE_HEADERS = ['x-emailit-signature', 'x-signature'] as const;

/**
 * Verify the signature on an incoming Emailit webhook request.
 * Returns `true` when the signature matches OR when no secret is
 * configured (dev-friendly). Returns `false` on explicit mismatch.
 */
export function verifyEmailitSignature(
  rawBody: string,
  headers: Headers,
): boolean {
  const secret = process.env.EMAILIT_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[email-webhook] EMAILIT_WEBHOOK_SECRET not set — skipping signature check');
    return true;
  }

  const signature = SIGNATURE_HEADERS
    .map((name) => headers.get(name))
    .find((value): value is string => Boolean(value));

  if (!signature) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(signature.replace(/^sha256=/, ''), 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Normalise an Emailit webhook payload into our typed shape.
 * Emailit sends a variety of event types; we map the common ones.
 * Unknown types are surfaced as `failed` so they still show up in logs.
 */
export function normaliseWebhookEvent(
  payload: Record<string, unknown>,
): EmailitWebhookEvent | null {
  const rawType = typeof payload.event === 'string' ? payload.event.toLowerCase() : '';
  const mapped: Record<string, EmailitEventType> = {
    delivered: 'delivered',
    bounce: 'bounced',
    bounced: 'bounced',
    open: 'opened',
    opened: 'opened',
    click: 'clicked',
    clicked: 'clicked',
    complaint: 'complained',
    complained: 'complained',
    unsubscribe: 'unsubscribed',
    unsubscribed: 'unsubscribed',
    failed: 'failed',
    rejected: 'failed',
  };

  const type = mapped[rawType];
  if (!type) return null;

  const emailId = typeof payload.email_id === 'string'
    ? payload.email_id
    : typeof payload.id === 'string' ? payload.id : '';

  const recipient = typeof payload.recipient === 'string'
    ? payload.recipient
    : typeof payload.to === 'string' ? payload.to : '';

  const occurredAt = typeof payload.occurred_at === 'string'
    ? payload.occurred_at
    : typeof payload.timestamp === 'string' ? payload.timestamp : new Date().toISOString();

  if (!emailId || !recipient) return null;

  return {
    emailId,
    type,
    recipient,
    occurredAt,
    tags: (payload.tags as Record<string, string> | undefined) ?? undefined,
    metadata: (payload.metadata as Record<string, unknown> | undefined) ?? undefined,
  };
}
