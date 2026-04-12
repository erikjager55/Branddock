// =============================================================
// Resend Email Publishing
//
// Uses the Resend SDK (already installed) to send emails.
// Credentials come from PublishChannel: apiKey in credentials,
// fromEmail/fromName in settings.
// Docs: https://resend.com/docs
// =============================================================

import { Resend } from 'resend';

export interface ResendEmailBody {
  /** Recipient email address */
  to: string | string[];
  /** Email subject line */
  subject: string;
  /** HTML body content */
  html: string;
  /** Plain text fallback */
  text?: string;
  /** Schedule for future delivery (ISO 8601) */
  scheduledAt?: string;
  /** Reply-to address */
  replyTo?: string;
}

export interface ResendEmailResult {
  id: string;
}

/**
 * Send an email via Resend.
 *
 * @param apiKey — Resend API key (from PublishChannel.credentials)
 * @param fromEmail — sender email (from PublishChannel.settings)
 * @param fromName — sender name (from PublishChannel.settings)
 * @param body — email content
 */
export async function sendViaResend(
  apiKey: string,
  fromEmail: string,
  fromName: string,
  body: ResendEmailBody,
): Promise<ResendEmailResult> {
  const resend = new Resend(apiKey);

  const result = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: Array.isArray(body.to) ? body.to : [body.to],
    subject: body.subject,
    html: body.html,
    text: body.text,
    replyTo: body.replyTo,
    scheduledAt: body.scheduledAt,
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }

  return { id: result.data?.id ?? '' };
}

/**
 * Convert markdown-ish content to basic HTML for email.
 * Simple converter — headings, bold, italic, paragraphs, line breaks.
 */
export function contentToEmailHtml(
  subject: string,
  body: string,
  ctaText?: string,
  ctaUrl?: string,
  accentColor: string = '#0d9488',
): string {
  // Convert markdown-like content to HTML
  let html = body
    .replace(/^## (.+)$/gm, '<h2 style="font-size:18px;font-weight:bold;margin:20px 0 8px;">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:16px;font-weight:600;margin:16px 0 6px;">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li style="margin:4px 0;">$1</li>')
    .replace(/\n\n/g, '</p><p style="margin:12px 0;">')
    .replace(/\n/g, '<br>');

  // Wrap list items
  html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/g, (match) =>
    `<ul style="padding-left:20px;margin:12px 0;">${match}</ul>`
  );

  const ctaHtml = ctaText
    ? `<div style="text-align:center;margin:24px 0;">
        <a href="${ctaUrl ?? '#'}" style="display:inline-block;padding:12px 24px;background-color:${accentColor};color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">
          ${ctaText}
        </a>
      </div>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background-color:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="height:4px;background-color:${accentColor};"></div>
      <div style="padding:32px 24px;">
        <h1 style="font-size:22px;font-weight:bold;margin:0 0 16px;color:#111827;">${subject}</h1>
        <div style="font-size:14px;line-height:1.6;color:#374151;">
          <p style="margin:12px 0;">${html}</p>
        </div>
        ${ctaHtml}
      </div>
      <div style="border-top:1px solid #e5e7eb;padding:16px 24px;background-color:#f9fafb;">
        <p style="font-size:11px;color:#9ca3af;text-align:center;margin:0;">
          <a href="#" style="color:#9ca3af;">Unsubscribe</a> · <a href="#" style="color:#9ca3af;">View in browser</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
