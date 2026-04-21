// =============================================================
// Emailit shared types (4.2)
// =============================================================

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  /** "Name <email>" or just "email" */
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** Freeform key/value pairs for Emailit's analytics — surfaces in webhook events. */
  tags?: Record<string, string>;
  /** Custom headers (e.g. List-Unsubscribe, X-Entity-Ref-ID). */
  headers?: Record<string, string>;
  /** Enable tracking. Default: open + click tracking on. */
  tracking?: { loads?: boolean; clicks?: boolean };
}

export interface SendEmailResult {
  /** Emailit-assigned send id (used for lookup / webhook correlation). */
  id: string;
  accepted: string[];
  rejected: string[];
  /** Raw response body for debug/logging. */
  raw: unknown;
}

export type EmailitEventType =
  | 'delivered'
  | 'bounced'
  | 'opened'
  | 'clicked'
  | 'complained'
  | 'unsubscribed'
  | 'failed';

export interface EmailitWebhookEvent {
  emailId: string;
  type: EmailitEventType;
  recipient: string;
  occurredAt: string; // ISO
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
}
