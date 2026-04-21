import { escape, renderCta, renderLayout } from './_layout';

export interface EmailVerificationVars {
  recipientEmail: string;
  userName?: string;
  verifyUrl: string;
}

export function renderEmailVerificationEmail(
  vars: EmailVerificationVars,
): { subject: string; html: string; text: string } {
  const subject = 'Verify your Branddock email';
  const greeting = vars.userName ? `Welcome ${escape(vars.userName)},` : 'Welcome,';

  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">${greeting}</p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      Confirm that this inbox belongs to you by clicking the button below.
    </p>
    ${renderCta(vars.verifyUrl, 'Verify email')}
    <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">
      If you didn't create a Branddock account, you can safely ignore this email.
    </p>
  `;

  const html = renderLayout({
    title: 'Verify your email',
    preheader: 'Confirm your Branddock email address.',
    body,
    footerNote: `Sent to ${vars.recipientEmail}.`,
  });

  const text = [
    greeting.replace(/,$/, ''),
    '',
    'Confirm your Branddock email address by visiting:',
    vars.verifyUrl,
    '',
    "If you didn't create a Branddock account, you can ignore this email.",
    '',
    '— Branddock',
  ].join('\n');

  return { subject, html, text };
}
