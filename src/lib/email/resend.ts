// =============================================================
// Email Service — Resend (Fase 2.3)
//
// Handles transactional email delivery via Resend API.
// Falls back gracefully if RESEND_API_KEY is not set (logs only).
//
// Env vars:
//  - RESEND_API_KEY      — Resend API key
//  - RESEND_FROM_EMAIL   — Sender address (default: noreply@branddock.com)
// =============================================================

import { Resend } from 'resend';

// ─── Types ─────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

// ─── Client (lazy init) ────────────────────────────────────

let resendClient: Resend | null = null;

function getClient(): Resend | null {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  resendClient = new Resend(apiKey);
  return resendClient;
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'Branddock <noreply@branddock.com>';
}

/**
 * Check whether email sending is configured.
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// ─── Core send function ────────────────────────────────────

/**
 * Send an email via Resend.
 * If Resend is not configured, logs the email details and returns success.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const client = getClient();

  if (!client) {
    console.info('[Email] Resend not configured. Would have sent:', {
      to: options.to,
      subject: options.subject,
    });
    return { success: true, id: 'dry-run' };
  }

  try {
    const { data, error } = await client.emails.send({
      from: getFromEmail(),
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error('[Email] Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Email] Failed to send:', message);
    return { success: false, error: message };
  }
}
