// =============================================================
// Shared email layout (4.2; restyled naar brandbook v3, 2026-07-16)
//
// Minimal HTML chrome around transactional email bodies.
// Slate header met het witte logo (PNG — SVG wordt door Gmail
// gestript), mint CTA met donkere tekst (contrast), mobile-friendly
// single column, plain inline CSS (no external stylesheets — many
// clients strip them).
// =============================================================

// Brandbook v3-kleuren (zelfde bron als de marketing-site).
const BRAND_MINT = '#07E5AB';
const BRAND_SLATE = '#1F2937';
// Donkere tekst op de mint-knop: wit-op-mint heeft te weinig contrast in mail.
const BRAND_CTA_TEXT = '#0B3B2E';
// Absolute asset-URL: e-mailclients kunnen alleen remote afbeeldingen laden.
const LOGO_URL = 'https://branddock.app/marketing/email/branddock-logo-white.png';

export type EmailLocale = 'en' | 'nl';

export interface LayoutOptions {
  preheader?: string;
  title: string;
  intro?: string;
  /**
   * Taal van deze mail. Stuurt `<html lang>` — screenreaders en
   * spamfilters lezen dat, en Gmail hangt er zijn vertaalprompt aan op.
   * Default 'en' zodat bestaande templates ongewijzigd blijven werken.
   */
  locale?: EmailLocale;
  body: string; // pre-rendered HTML (paragraphs, cta block, etc.)
  footerNote?: string;
  /**
   * Optional footer link (e.g. unsubscribe). Rendered as a real anchor —
   * `footerNote` is escaped as plain text, so a URL pasted in there would
   * arrive unclickable.
   */
  footerLink?: { href: string; label: string };
}

export function renderLayout(opts: LayoutOptions): string {
  const preheader = opts.preheader ?? opts.title;
  return `<!DOCTYPE html>
<html lang="${opts.locale ?? 'en'}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escape(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
<span style="display:none !important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${escape(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <tr>
          <td style="background:${BRAND_SLATE};padding:20px 32px;">
            <img src="${LOGO_URL}" alt="Branddock" height="24" style="display:block;height:24px;width:auto;border:0;" />
          </td>
        </tr>
        <tr>
          <td style="height:3px;background:${BRAND_MINT};font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600;color:${BRAND_SLATE};line-height:1.3;">${escape(opts.title)}</h1>
            ${opts.intro ? `<p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#334155;">${escape(opts.intro)}</p>` : ''}
            ${opts.body}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;">
            <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;">
              ${opts.footerNote ? escape(opts.footerNote) + '<br>' : ''}
              ${opts.footerLink ? `<a href="${escape(opts.footerLink.href)}" style="color:#0d9f7e;">${escape(opts.footerLink.label)}</a><br>` : ''}
              &copy; ${new Date().getFullYear()} Branddock &middot; <a href="https://branddock.app" style="color:#0d9f7e;text-decoration:none;">branddock.app</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** HTML-escape user-supplied strings injected into the template. */
export function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Body-bouwstenen ──────────────────────────────────────────
//
// Elke mail componeerde tot 2026-08-15 zijn eigen inline-styled <p>'s, met
// als gevolg dat "identiek format" een afspraak was in plaats van iets
// afdwingbaars. Deze primitives zijn de enige toegestane bouwstenen voor een
// body; wie ze gebruikt krijgt automatisch dezelfde typografie.

/** Standaard bodyparagraaf. `html` mag inline-markup bevatten (bv. <strong>). */
export function paragraph(html: string): string {
  return `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">${html}</p>`;
}

/** Kleinere, grijze regel — voor secundaire links onder de CTA. */
export function note(html: string): string {
  return `<p style="margin:16px 0 0 0;font-size:13px;line-height:1.5;color:#64748b;">${html}</p>`;
}

/** Inline tekstlink in de body-stijl. */
export function link(href: string, label: string): string {
  return `<a href="${escape(href)}" style="color:#0f766e;">${escape(label)}</a>`;
}

/**
 * Opsomming van concrete bevindingen uit de scan — het verschil tussen een
 * generieke mail en een die het merk kent.
 */
export function bulletList(items: string[]): string {
  if (items.length === 0) return '';
  const lis = items
    .map(
      (i) =>
        `<li style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#334155;">${escape(i)}</li>`,
    )
    .join('');
  return `<ul style="margin:0 0 16px 0;padding-left:20px;">${lis}</ul>`;
}

const COPY_LINK_LABEL: Record<'en' | 'nl', string> = {
  en: 'Or copy this link:',
  nl: 'Of kopieer deze link:',
};

/** Render a mint pill-button CTA. Caller supplies href + label (both escaped here). */
export function renderCta(href: string, label: string, locale: 'en' | 'nl' = 'en'): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="background:${BRAND_MINT};border-radius:8px;">
      <a href="${escape(href)}" style="display:inline-block;padding:12px 24px;color:${BRAND_CTA_TEXT};font-size:15px;font-weight:700;text-decoration:none;">${escape(label)}</a>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px 0;font-size:13px;line-height:1.5;color:#64748b;">${COPY_LINK_LABEL[locale]} <a href="${escape(href)}" style="color:#0d9f7e;word-break:break-all;">${escape(href)}</a></p>`;
}
