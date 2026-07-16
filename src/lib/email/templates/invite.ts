import { escape, renderCta, renderLayout } from './_layout';
import type { EmailLocale } from '../email-locale';

export interface InviteEmailVars {
  recipientEmail: string;
  inviterName: string;
  organizationName: string;
  role: string;
  acceptUrl: string;
  expiresAt: Date;
  /** E-mailtaal; voor bestaande ontvangers hun voorkeur, anders die van de uitnodiger. */
  locale?: EmailLocale;
}

const STRINGS = {
  en: {
    // Keep subject close to natural conversation — "X invited you to join Y"
    // is the shape Gmail recognises as legitimate transactional mail.
    subject: (inviter: string, org: string) => `${inviter} invited you to join ${org}`,
    title: (org: string) => `You're invited to ${org}`,
    preheader: (inviter: string, role: string) =>
      `${inviter} invited you to Branddock as a ${role}.`,
    intro: (inviter: string, org: string, role: string) =>
      `<strong>${inviter}</strong> has invited you to join <strong>${org}</strong> on Branddock as a <strong>${role}</strong>.`,
    productLine:
      'Branddock is the AI-native brand operating system where strategy, content and creative work live together.',
    cta: 'Accept invitation',
    expiry: (days: number) =>
      `This invitation expires in ${days} day${days === 1 ? '' : 's'}. If you weren't expecting this, you can safely ignore this email.`,
    footer: (email: string) => `Sent to ${email}.`,
    textIntro: (inviter: string, org: string, role: string) =>
      `${inviter} invited you to join ${org} on Branddock as a ${role}.`,
    textAccept: 'Accept the invitation:',
    textExpiry: (days: number) => `This invitation expires in ${days} day${days === 1 ? '' : 's'}.`,
  },
  nl: {
    subject: (inviter: string, org: string) => `${inviter} nodigt je uit voor ${org}`,
    title: (org: string) => `Je bent uitgenodigd voor ${org}`,
    preheader: (inviter: string, role: string) =>
      `${inviter} nodigt je uit voor Branddock als ${role}.`,
    intro: (inviter: string, org: string, role: string) =>
      `<strong>${inviter}</strong> heeft je uitgenodigd om deel te nemen aan <strong>${org}</strong> op Branddock als <strong>${role}</strong>.`,
    productLine:
      'Branddock is het AI-platform waar merkstrategie, content en creatie samenkomen.',
    cta: 'Uitnodiging accepteren',
    expiry: (days: number) =>
      `Deze uitnodiging verloopt over ${days} dag${days === 1 ? '' : 'en'}. Verwachtte je deze uitnodiging niet? Dan kun je deze e-mail veilig negeren.`,
    footer: (email: string) => `Verzonden aan ${email}.`,
    textIntro: (inviter: string, org: string, role: string) =>
      `${inviter} heeft je uitgenodigd voor ${org} op Branddock als ${role}.`,
    textAccept: 'Accepteer de uitnodiging:',
    textExpiry: (days: number) =>
      `Deze uitnodiging verloopt over ${days} dag${days === 1 ? '' : 'en'}.`,
  },
} as const;

export function renderInviteEmail(vars: InviteEmailVars): { subject: string; html: string; text: string } {
  const locale: EmailLocale = vars.locale ?? 'en';
  const s = STRINGS[locale];

  const daysLeft = Math.max(
    1,
    Math.ceil((vars.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
  );

  const inviter = escape(vars.inviterName);
  const org = escape(vars.organizationName);
  const role = escape(vars.role);

  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      ${s.intro(inviter, org, role)}
    </p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      ${s.productLine}
    </p>
    ${renderCta(vars.acceptUrl, s.cta, locale)}
    <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">
      ${s.expiry(daysLeft)}
    </p>
  `;

  const html = renderLayout({
    title: s.title(vars.organizationName),
    preheader: s.preheader(vars.inviterName, vars.role),
    body,
    footerNote: s.footer(vars.recipientEmail),
  });

  const text = [
    s.textIntro(vars.inviterName, vars.organizationName, vars.role),
    '',
    `${s.textAccept} ${vars.acceptUrl}`,
    '',
    s.textExpiry(daysLeft),
    '',
    '— Branddock',
  ].join('\n');

  return { subject: s.subject(vars.inviterName, vars.organizationName), html, text };
}
