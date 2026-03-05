// =============================================================
// Email Templates (Fase 2.3)
//
// HTML email templates for transactional emails.
// Inline styles for maximum email client compatibility.
// =============================================================

const BRAND_COLOR = '#1FD1B2';
const BRAND_NAME = 'Branddock';

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f4f4f5;color:#18181b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_COLOR};padding:24px 32px;">
              <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">${BRAND_NAME}</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;text-align:center;">
              &copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

// ─── Invitation Email ──────────────────────────────────────

export interface InvitationTemplateData {
  inviterName: string;
  organizationName: string;
  role: string;
  acceptUrl: string;
  expiresInDays: number;
}

export function invitationEmail(data: InvitationTemplateData): { html: string; text: string } {
  const html = baseLayout(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;">You've been invited!</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
      <strong>${data.inviterName}</strong> has invited you to join
      <strong>${data.organizationName}</strong> on ${BRAND_NAME} as a <strong>${data.role}</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="background-color:${BRAND_COLOR};border-radius:8px;padding:12px 28px;">
          <a href="${data.acceptUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">
            Accept Invitation
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#a1a1aa;">
      This invitation expires in ${data.expiresInDays} days. If you didn't expect this, you can safely ignore it.
    </p>
  `);

  const text = [
    `You've been invited to ${data.organizationName} on ${BRAND_NAME}!`,
    '',
    `${data.inviterName} has invited you as a ${data.role}.`,
    '',
    `Accept the invitation: ${data.acceptUrl}`,
    '',
    `This invitation expires in ${data.expiresInDays} days.`,
  ].join('\n');

  return { html, text };
}

// ─── Password Reset Email ──────────────────────────────────

export interface PasswordResetTemplateData {
  resetUrl: string;
  expiresInMinutes: number;
}

export function passwordResetEmail(data: PasswordResetTemplateData): { html: string; text: string } {
  const html = baseLayout(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;">Reset your password</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
      We received a request to reset your ${BRAND_NAME} password. Click the button below to choose a new password.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="background-color:${BRAND_COLOR};border-radius:8px;padding:12px 28px;">
          <a href="${data.resetUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">
            Reset Password
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#a1a1aa;">
      This link expires in ${data.expiresInMinutes} minutes. If you didn't request this, you can safely ignore it.
    </p>
  `);

  const text = [
    `Reset your ${BRAND_NAME} password`,
    '',
    `Click this link to reset your password: ${data.resetUrl}`,
    '',
    `This link expires in ${data.expiresInMinutes} minutes.`,
    `If you didn't request this, you can safely ignore it.`,
  ].join('\n');

  return { html, text };
}
