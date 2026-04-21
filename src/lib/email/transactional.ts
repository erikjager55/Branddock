// =============================================================
// Transactional email service (4.2)
//
// High-level wrapper around emailit-client for sending branded
// transactional emails (invites, password reset, verification).
// Falls back to logging the payload in dev when no API key is set.
// =============================================================

import { emailitClient, isEmailitConfigured, EmailitError } from './emailit-client';
import type { SendEmailOptions, SendEmailResult } from './types';

const DEFAULT_FROM_EMAIL = 'noreply@branddock.app';
const DEFAULT_FROM_NAME = 'Branddock';

function resolveFrom(): string {
  const email = process.env.EMAILIT_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  const name = process.env.EMAILIT_FROM_NAME || DEFAULT_FROM_NAME;
  return `${name} <${email}>`;
}

/**
 * Send a transactional email via Emailit.
 * - No API key: logs the email payload and returns a stub result (dev-friendly).
 * - Error: throws EmailitError. Callers decide whether to swallow or propagate.
 */
export async function sendTransactional(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  if (!isEmailitConfigured()) {
    console.warn(
      '[email] EMAILIT_API_KEY not set — email not sent.',
      JSON.stringify({ to: recipients, subject: options.subject }, null, 2),
    );
    return {
      id: `dev-stub-${Date.now()}`,
      accepted: recipients,
      rejected: [],
      raw: { devStub: true },
    };
  }

  const body: Record<string, unknown> = {
    from: options.from ?? resolveFrom(),
    to: recipients,
    subject: options.subject,
    html: options.html,
  };

  if (options.text) body.text = options.text;
  if (options.replyTo) body.reply_to = options.replyTo;
  if (options.tags) body.tags = options.tags;
  if (options.headers) body.headers = options.headers;
  if (options.tracking !== undefined) body.tracking = options.tracking;

  const response = await emailitClient.sendEmail(body);
  const id = typeof response?.id === 'string' ? response.id : `emailit-${Date.now()}`;

  return {
    id,
    accepted: recipients,
    rejected: [],
    raw: response,
  };
}

/**
 * Send transactional but never throw — returns { ok, error? } tuple.
 * Use this in paths where the business action should still succeed
 * if the email fails (e.g. invite record is created even if mail bounces).
 */
export async function trySendTransactional(
  options: SendEmailOptions,
): Promise<{ ok: true; result: SendEmailResult } | { ok: false; error: string }> {
  try {
    const result = await sendTransactional(options);
    return { ok: true, result };
  } catch (err) {
    const message = err instanceof EmailitError
      ? `${err.message} (status ${err.status})`
      : err instanceof Error
        ? err.message
        : 'Unknown send error';
    console.error('[email] sendTransactional failed:', message);
    return { ok: false, error: message };
  }
}
