import { escape, renderCta, renderLayout } from './_layout';
import type { EmailLocale } from '../email-locale';

export interface EmailVerificationVars {
  recipientEmail: string;
  userName?: string;
  verifyUrl: string;
  /** E-mailtaal (Settings → Appearance); default 'en'. */
  locale?: EmailLocale;
}

const STRINGS = {
  en: {
    subject: 'Verify your Branddock email',
    title: 'Verify your email',
    preheader: 'Confirm your Branddock email address.',
    greeting: (name?: string) => (name ? `Welcome ${name},` : 'Welcome,'),
    body: 'Confirm that this inbox belongs to you by clicking the button below.',
    cta: 'Verify email',
    ignore: "If you didn't create a Branddock account, you can safely ignore this email.",
    footer: (email: string) => `Sent to ${email}.`,
    textIntro: 'Confirm your Branddock email address by visiting:',
  },
  nl: {
    subject: 'Bevestig je e-mailadres voor Branddock',
    title: 'Bevestig je e-mailadres',
    preheader: 'Bevestig je e-mailadres voor Branddock.',
    greeting: (name?: string) => (name ? `Welkom ${name},` : 'Welkom,'),
    body: 'Bevestig dat dit e-mailadres van jou is door op de knop hieronder te klikken.',
    cta: 'E-mailadres bevestigen',
    ignore: 'Heb je geen Branddock-account aangemaakt? Dan kun je deze e-mail veilig negeren.',
    footer: (email: string) => `Verzonden aan ${email}.`,
    textIntro: 'Bevestig je e-mailadres voor Branddock via:',
  },
} as const;

export function renderEmailVerificationEmail(
  vars: EmailVerificationVars,
): { subject: string; html: string; text: string } {
  const locale: EmailLocale = vars.locale ?? 'en';
  const s = STRINGS[locale];
  const greeting = s.greeting(vars.userName ? escape(vars.userName) : undefined);

  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">${greeting}</p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      ${s.body}
    </p>
    ${renderCta(vars.verifyUrl, s.cta, locale)}
    <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">
      ${s.ignore}
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
    vars.verifyUrl,
    '',
    s.ignore,
    '',
    '— Branddock',
  ].join('\n');

  return { subject: s.subject, html, text };
}
