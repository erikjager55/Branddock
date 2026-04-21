import { escape, renderCta, renderLayout } from './_layout';

export interface PasswordResetEmailVars {
  recipientEmail: string;
  userName?: string;
  resetUrl: string;
  /** Minutes until the reset link expires (Better Auth default = 60). */
  expiresInMinutes?: number;
}

export function renderPasswordResetEmail(
  vars: PasswordResetEmailVars,
): { subject: string; html: string; text: string } {
  const subject = 'Reset your Branddock password';
  const expiresInMinutes = vars.expiresInMinutes ?? 60;
  const greeting = vars.userName ? `Hi ${escape(vars.userName)},` : 'Hi there,';

  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">${greeting}</p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      We received a request to reset the password for your Branddock account. Click the button below to choose a new one.
    </p>
    ${renderCta(vars.resetUrl, 'Reset password')}
    <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">
      This link expires in ${expiresInMinutes} minutes. If you didn't request a reset, you can ignore this email — your password stays the same.
    </p>
  `;

  const html = renderLayout({
    title: 'Reset your password',
    preheader: 'Reset your Branddock password.',
    body,
    footerNote: `Sent to ${vars.recipientEmail}.`,
  });

  const text = [
    greeting.replace(/,$/, ''),
    '',
    'We received a request to reset the password for your Branddock account.',
    '',
    `Reset link: ${vars.resetUrl}`,
    '',
    `This link expires in ${expiresInMinutes} minutes. If you didn't request this, ignore the email.`,
    '',
    '— Branddock',
  ].join('\n');

  return { subject, html, text };
}
