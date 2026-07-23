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

// Emailit-spec (docs/webhooks/request-signature): HMAC-SHA256, hex, getekend
// over `${timestamp}.${rawBody}` — NIET de body alleen. Header X-Emailit-
// Signature + X-Emailit-Timestamp; secret is een door Emailit gegenereerde
// whsec_-sleutel per endpoint. De oude implementatie tekende alleen de body en
// zou dus élke echte Emailit-delivery afwijzen (audit 2026-07-23).
const SIGNATURE_HEADER = 'x-emailit-signature';
const TIMESTAMP_HEADER = 'x-emailit-timestamp';
/** Replay-venster: weiger een handtekening met een te oude timestamp. */
const REPLAY_TOLERANCE_MS = 5 * 60 * 1000;

/** Parse de Emailit-timestamp (unit ondocumenteerd) → epoch-ms, of null. */
function timestampToMs(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  // ≤10 cijfers = seconden (epoch-sec loopt tot 2286), anders al milliseconden.
  return raw.trim().length <= 10 ? n * 1000 : n;
}

/**
 * Verify the signature on an incoming Emailit webhook request.
 * Returns `true` only on a valid, fresh signature.
 *
 * Fail-CLOSED in productie: een ontbrekend secret betekent weigeren, nooit
 * stil doorlaten (was fail-open → live unauth email-suppression-vector,
 * audit 2026-07-23). In non-productie blijft fail-open voor lokaal gemak.
 */
export function verifyEmailitSignature(
  rawBody: string,
  headers: Headers,
): boolean {
  const secret = process.env.EMAILIT_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[email-webhook] EMAILIT_WEBHOOK_SECRET niet gezet — webhook geweigerd (fail-closed)');
      return false;
    }
    console.warn('[email-webhook] EMAILIT_WEBHOOK_SECRET not set — skipping signature check (dev only)');
    return true;
  }

  const signature = headers.get(SIGNATURE_HEADER) ?? headers.get('x-signature');
  const timestamp = headers.get(TIMESTAMP_HEADER);
  if (!signature || !timestamp) return false;

  // Replay-bescherming: verwerp een timestamp buiten het tolerantievenster.
  const tsMs = timestampToMs(timestamp);
  if (tsMs === null || Math.abs(Date.now() - tsMs) > REPLAY_TOLERANCE_MS) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
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
