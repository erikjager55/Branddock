// =============================================================
// brand.md rapport-mail (touchpoint 2.1 — reciprociteit + ability)
//
// Verstuurd éénmalig, direct na de eerste e-mail-capture op een
// generator-draft (harde gate, user-besluit 2026-08-14). Inhoud:
// het volledige score-rapport (score, hoofdbevindingen, dimensies),
// de download-link, drie gebruiksrecepten en de claim-CTA. EN-only
// (generator is EN-first). Eerlijkheidsregel: dit is de enige mail
// over deze scan zolang de lifecycle-sequence (2.2-2.5) niet bestaat
// — en dat zeggen we ook.
// =============================================================

import { renderLayout, renderCta, escape } from './_layout';
import type { HumanFinding } from '@/lib/brandmd/findings';

export interface BrandMdReportEmailVars {
  brandName: string;
  domain: string;
  score: number;
  findings: HumanFinding[];
  dimensions: Array<{ label: string; score: number; explanation: string }>;
  downloadUrl: string;
  claimUrl?: string;
  useHubUrl: string;
  expiresAt: Date;
}

export function renderBrandMdReportEmail(vars: BrandMdReportEmailVars): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Your Brand Score for ${vars.domain}: ${vars.score}/100 — report + your brand.md`;

  const findingsHtml = vars.findings
    .map(
      (f) => `
      <tr>
        <td style="padding:4px 8px 4px 0;font-size:15px;line-height:1.5;vertical-align:top;">${f.positive ? '✔' : '✖'}</td>
        <td style="padding:4px 0;font-size:14px;line-height:1.55;color:#334155;">${escape(f.text)}</td>
      </tr>`,
    )
    .join('');

  const dimensionsHtml = vars.dimensions
    .map(
      (d) => `
      <tr>
        <td style="padding:6px 12px 6px 0;font-size:13px;color:#64748b;white-space:nowrap;vertical-align:top;">${escape(d.label)} · <strong style="color:#0f172a;">${d.score}</strong></td>
        <td style="padding:6px 0;font-size:13px;line-height:1.5;color:#64748b;">${escape(d.explanation)}</td>
      </tr>`,
    )
    .join('');

  const expiresDate = vars.expiresAt.toISOString().slice(0, 10);

  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      Here's the full report for <strong>${escape(vars.domain)}</strong> — how well AI tools like
      ChatGPT and Claude can play your brand, based on what your website reveals.
    </p>
    <p style="margin:0 0 20px 0;font-size:40px;font-weight:700;color:#0f172a;">
      ${vars.score}<span style="font-size:20px;color:#94a3b8;">/100</span>
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">${findingsHtml}</table>
    <p style="margin:0 0 6px 0;font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">How we scored this</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">${dimensionsHtml}</table>
    <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#334155;">
      <a href="${vars.downloadUrl}" style="color:#0f766e;font-weight:600;">Download your brand.md</a>
      — then the 30-second setup:
    </p>
    <ul style="margin:0 0 20px 0;padding-left:18px;font-size:14px;line-height:1.7;color:#334155;">
      <li><strong>Claude</strong>: create a Project → drag brand.md in → every chat is on-brand.</li>
      <li><strong>ChatGPT</strong>: Settings → Custom Instructions → paste the Voice section.</li>
      <li><strong>Any AI chat</strong>: paste the whole file above your prompt — it's only ~2 pages.</li>
    </ul>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">
      The open fields in your file are marked <code>unvalidated</code> — that's what a website
      alone can't reveal. The living, validated version completes them and stays current as your
      brand evolves:
    </p>
    ${vars.claimUrl ? renderCta(vars.claimUrl, 'Claim & complete your brand — free for 28 days') : ''}
    <p style="margin:16px 0 0 0;font-size:13px;line-height:1.5;color:#64748b;">
      Full walkthroughs: <a href="${vars.useHubUrl}" style="color:#0f766e;">${vars.useHubUrl.replace('https://', '')}</a>
    </p>
  `;

  const html = renderLayout({
    title: `Your Brand Score: ${vars.score}/100`,
    preheader: `How AI-ready is ${vars.domain}? Your report and brand.md are inside.`,
    intro: undefined,
    body,
    footerNote: `This is a one-time email about your scan of ${vars.domain} — no newsletter, no follow-up sequence. Your draft (and this download link) expires on ${expiresDate}.`,
  });

  const text = [
    `Your Brand Score for ${vars.domain}: ${vars.score}/100`,
    '',
    ...vars.findings.map((f) => `${f.positive ? '+' : '-'} ${f.text}`),
    '',
    'How we scored this:',
    ...vars.dimensions.map((d) => `${d.label} ${d.score} — ${d.explanation}`),
    '',
    `Download your brand.md: ${vars.downloadUrl}`,
    vars.claimUrl ? `Claim & complete your brand (free for 28 days): ${vars.claimUrl}` : '',
    `How to use the file: ${vars.useHubUrl}`,
    '',
    `One-time email — no newsletter. Your draft expires on ${expiresDate}.`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html, text };
}
