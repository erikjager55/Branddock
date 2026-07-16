import { escape, renderCta, renderLayout } from './_layout';
import type { EmailLocale } from '../email-locale';

export interface PasswordResetEmailVars {
  recipientEmail: string;
  userName?: string;
  resetUrl: string;
  /** Minutes until the reset link expires (Better Auth default = 60). */
  expiresInMinutes?: number;
  /** E-mailtaal (Settings → Appearance); default 'en'. */
  locale?: EmailLocale;
}

const STRINGS = {
  en: {
    subject: 'Reset your Branddock password',
    title: 'Reset your password',
    preheader: 'Reset your Branddock password.',
    greeting: (name?: string) => (name ? `Hi ${name},` : 'Hi there,'),
    body: 'We received a request to reset the password for your Branddock account. Click the button below to choose a new one.',
    cta: 'Reset password',
    expiry: (m: number) =>
      `This link expires in ${m} minutes. If you didn't request a reset, you can ignore this email — your password stays the same.`,
    footer: (email: string) => `Sent to ${email}.`,
    textIntro: 'We received a request to reset the password for your Branddock account.',
    textLink: 'Reset link:',
    textExpiry: (m: number) =>
      `This link expires in ${m} minutes. If you didn't request this, ignore the email.`,
  },
  nl: {
    subject: 'Stel je Branddock-wachtwoord opnieuw in',
    title: 'Wachtwoord opnieuw instellen',
    preheader: 'Stel je Branddock-wachtwoord opnieuw in.',
    greeting: (name?: string) => (name ? `Hoi ${name},` : 'Hoi,'),
    body: 'We ontvingen een verzoek om het wachtwoord van je Branddock-account opnieuw in te stellen. Klik op de knop hieronder om een nieuw wachtwoord te kiezen.',
    cta: 'Wachtwoord opnieuw instellen',
    expiry: (m: number) =>
      `Deze link verloopt over ${m} minuten. Heb je dit niet aangevraagd? Negeer deze e-mail — je wachtwoord blijft ongewijzigd.`,
    footer: (email: string) => `Verzonden aan ${email}.`,
    textIntro: 'We ontvingen een verzoek om het wachtwoord van je Branddock-account opnieuw in te stellen.',
    textLink: 'Herstel-link:',
    textExpiry: (m: number) =>
      `Deze link verloopt over ${m} minuten. Heb je dit niet aangevraagd? Negeer deze e-mail.`,
  },
} as const;

export function renderPasswordResetEmail(
  vars: PasswordResetEmailVars,
): { subject: string; html: string; text: string } {
  const locale: EmailLocale = vars.locale ?? 'en';
  const s = STRINGS[locale];
  const expiresInMinutes = vars.expiresInMinutes ?? 60;
  const greeting = s.greeting(vars.userName ? escape(vars.userName) : undefined);

  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">${greeting}</p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      ${s.body}
    </p>
    ${renderCta(vars.resetUrl, s.cta, locale)}
    <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">
      ${s.expiry(expiresInMinutes)}
    </p>
  `;

  const html = renderLayout({
    title: s.title,
    preheader: s.preheader,
    body,
    footerNote: s.footer(vars.recipientEmail),
  });

  const text = [
    greeting.replace(/,$/, ''),
    '',
    s.textIntro,
    '',
    `${s.textLink} ${vars.resetUrl}`,
    '',
    s.textExpiry(expiresInMinutes),
    '',
    '— Branddock',
  ].join('\n');

  return { subject: s.subject, html, text };
}
