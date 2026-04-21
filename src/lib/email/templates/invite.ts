import { escape, renderCta, renderLayout } from './_layout';

export interface InviteEmailVars {
  recipientEmail: string;
  inviterName: string;
  organizationName: string;
  role: string;
  acceptUrl: string;
  expiresAt: Date;
}

export function renderInviteEmail(vars: InviteEmailVars): { subject: string; html: string; text: string } {
  const subject = `${vars.inviterName} invited you to ${vars.organizationName} on Branddock`;

  const daysLeft = Math.max(
    1,
    Math.ceil((vars.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
  );

  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      <strong>${escape(vars.inviterName)}</strong> has invited you to join
      <strong>${escape(vars.organizationName)}</strong> on Branddock as a
      <strong>${escape(vars.role)}</strong>.
    </p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      Branddock is the AI-native brand operating system where strategy, content and creative work live together.
    </p>
    ${renderCta(vars.acceptUrl, 'Accept invitation')}
    <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">
      This invitation expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. If you weren't expecting this, you can safely ignore this email.
    </p>
  `;

  const html = renderLayout({
    title: `You're invited to ${vars.organizationName}`,
    preheader: `${vars.inviterName} invited you to Branddock as a ${vars.role}.`,
    body,
    footerNote: `Sent to ${vars.recipientEmail}.`,
  });

  const text = [
    `${vars.inviterName} invited you to join ${vars.organizationName} on Branddock as a ${vars.role}.`,
    '',
    `Accept the invitation: ${vars.acceptUrl}`,
    '',
    `This invitation expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
    '',
    '— Branddock',
  ].join('\n');

  return { subject, html, text };
}
