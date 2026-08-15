// =============================================================
// BRAND.md lifecycle-mails (touchpoints fase 2 — 2.2 t/m 2.5)
//
// Verzonden door de dagelijkse cron (/api/cron/brandmd-lifecycle):
//   2.2 (+24u)     — één praktische tip + uitleg `unvalidated` (opt-in)
//   2.3 (dag 7+)   — concurrent-scan / benchmark-reflex (opt-in)
//   2.4 (dag 21+)  — "je bestand veroudert", feitelijk (opt-in)
//   2.5 (T-10d)    — TTL-melding, service-bericht, laatste mail
//
// Do's/don'ts uit de touchpoint-strategie zijn hier wet: concreet
// resultaat centraal (2.2), geen bangmakerij met concurrent-scores
// (2.3), feitelijk over veroudering (2.4), geen verlenging-trucjes
// (2.5). Alle mails EN-only (generator is EN-first) en dragen een
// zichtbare unsubscribe-link; de cron zet daarnaast de
// List-Unsubscribe-headers.
// =============================================================

import { renderLayout, renderCta, escape } from './_layout';

export type LifecycleStage = '2.2' | '2.3' | '2.4' | '2.5';

export interface LifecycleEmailVars {
  brandName: string;
  domain: string;
  score: number | null;
  downloadUrl: string;
  claimUrl?: string;
  generatorUrl: string;
  unsubscribeUrl: string;
  generatedAt: Date;
  expiresAt: Date;
}

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderLifecycleEmail(stage: LifecycleStage, vars: LifecycleEmailVars): RenderedEmail {
  switch (stage) {
    case '2.2':
      return renderTip(vars);
    case '2.3':
      return renderBenchmark(vars);
    case '2.4':
      return renderAging(vars);
    case '2.5':
      return renderExpiry(vars);
  }
}

// ─── 2.2 — één tip, binnen het 48-uurs-venster ────────

function renderTip(vars: LifecycleEmailVars): RenderedEmail {
  const subject = `One tip to get more out of your ${vars.domain} BRAND.md today`;
  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      Quick check: did your BRAND.md make it into a tool yet? If not, here's the
      one setup that pays off immediately:
    </p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      <strong>Drop the file into the AI tool you already use most.</strong> In Claude: create a
      Project and drag it in — every chat in that Project is on-brand from then on. In ChatGPT:
      paste the Voice section into Custom Instructions. Then ask for something you'd normally
      write yourself and compare.
    </p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      One honest note: the fields marked <code>unvalidated</code> are what your website alone
      couldn't prove — the tool is following a scan's best guess there, not your brand. Confirming
      them is exactly what the living version is for:
    </p>
    ${vars.claimUrl ? renderCta(vars.claimUrl, 'Complete your brand — free for 28 days') : ''}
    <p style="margin:16px 0 0 0;font-size:13px;line-height:1.5;color:#64748b;">
      Lost the file? <a href="${vars.downloadUrl}" style="color:#0f766e;">Download it again</a>.
    </p>
  `;
  return finish(vars, subject, `Your BRAND.md works best inside a tool — here's the 30-second setup.`, body, [
    `Quick check: did your BRAND.md make it into a tool yet?`,
    `The one setup that pays off immediately: drop the file into the AI tool you use most.`,
    `Claude: create a Project and drag it in. ChatGPT: paste the Voice section into Custom Instructions.`,
    `Fields marked "unvalidated" are a scan's best guess — completing them is what the living version is for.`,
    vars.claimUrl ? `Complete your brand (free for 28 days): ${vars.claimUrl}` : '',
    `Download the file again: ${vars.downloadUrl}`,
  ]);
}

// ─── 2.3 — benchmark-reflex, zonder bangmakerij ───────

function renderBenchmark(vars: LifecycleEmailVars): RenderedEmail {
  const subject = `Where does ${vars.domain} stand? Scan a competitor`;
  const score = vars.score != null ? `${vars.score}/100` : 'your score';
  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      ${escape(vars.domain)} scored <strong>${escape(score)}</strong> — but a score only really
      means something next to another one.
    </p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      The generator is free and works on any public website. Scan a competitor (or the brand you
      admire most in your category) and see how AI-ready their public presence is compared to
      yours. Same scan, same honest scoring.
    </p>
    ${renderCta(vars.generatorUrl, 'Scan another site — free')}
    <p style="margin:16px 0 0 0;font-size:13px;line-height:1.5;color:#64748b;">
      Your own file: <a href="${vars.downloadUrl}" style="color:#0f766e;">download again</a>${vars.claimUrl ? ` · living version: <a href="${vars.claimUrl}" style="color:#0f766e;">claim your brand</a>` : ''}.
    </p>
  `;
  return finish(vars, subject, `A score means more next to another one — the generator is free for any site.`, body, [
    `${vars.domain} scored ${score} — but a score only means something next to another one.`,
    `Scan a competitor or the brand you admire most: ${vars.generatorUrl}`,
    `Your own file again: ${vars.downloadUrl}`,
    vars.claimUrl ? `Living version: ${vars.claimUrl}` : '',
  ]);
}

// ─── 2.4 — veroudering, feitelijk ─────────────────────

function renderAging(vars: LifecycleEmailVars): RenderedEmail {
  const generated = vars.generatedAt.toISOString().slice(0, 10);
  const subject = `Your ${vars.domain} BRAND.md is from ${generated}`;
  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      Your BRAND.md was generated on <strong>${escape(generated)}</strong>. Everything your brand
      has done since — new copy, a shifted positioning, a refreshed palette — isn't in it.
    </p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      That's the difference between a snapshot and a living version: a Branddock workspace keeps
      the file current and serves it to your tools automatically (REST + MCP), so an agent never
      writes from last month's brand.
    </p>
    ${vars.claimUrl ? renderCta(vars.claimUrl, 'Make it a living file — free for 28 days') : ''}
  `;
  return finish(vars, subject, `A generated file is a snapshot — here's what a living version does.`, body, [
    `Your BRAND.md was generated on ${generated}. Everything since isn't in it.`,
    `A workspace keeps the file current and serves it to your tools automatically (REST + MCP).`,
    vars.claimUrl ? `Make it a living file (free for 28 days): ${vars.claimUrl}` : '',
  ]);
}

// ─── 2.5 — TTL, service-bericht, laatste mail ─────────

function renderExpiry(vars: LifecycleEmailVars): RenderedEmail {
  const expires = vars.expiresAt.toISOString().slice(0, 10);
  const subject = `Your ${vars.domain} draft expires on ${expires}`;
  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      A heads-up, as promised when you scanned ${escape(vars.domain)}: we keep generator drafts
      for 90 days, and yours expires on <strong>${escape(expires)}</strong>. After that the draft,
      the download link and the claim link stop working.
    </p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      Two ways to keep what you need — or simply let it expire:
    </p>
    <ul style="margin:0 0 16px 0;padding-left:18px;font-size:14px;line-height:1.7;color:#334155;">
      <li><a href="${vars.downloadUrl}" style="color:#0f766e;">Download the file</a> — it's yours, it keeps working forever.</li>
      ${vars.claimUrl ? `<li><a href="${vars.claimUrl}" style="color:#0f766e;">Claim your workspace</a> — turns the draft into a living, maintained version.</li>` : ''}
    </ul>
    <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">
      This is the final email about this draft.
    </p>
  `;
  return finish(
    vars,
    subject,
    `Drafts are kept for 90 days — yours expires on ${expires}.`,
    body,
    [
      `We keep generator drafts for 90 days; yours expires on ${expires}.`,
      `Download the file (yours forever): ${vars.downloadUrl}`,
      vars.claimUrl ? `Claim your workspace: ${vars.claimUrl}` : '',
      `This is the final email about this draft.`,
    ],
    // 2.5 is een service-bericht over opgeslagen data — gaat ook naar wie
    // niet voor tips koos; de footer claimt dus geen tips-opt-in.
    `Service notice about the draft we store for your scan of ${vars.domain} — this is the final email about it.`,
  );
}

// ─── Gedeelde afronding ───────────────────────────────

function finish(
  vars: LifecycleEmailVars,
  subject: string,
  preheader: string,
  body: string,
  textLines: string[],
  footerOverride?: string,
): RenderedEmail {
  const html = renderLayout({
    title: subject,
    preheader,
    intro: undefined,
    body,
    // footerOverride vervangt de tips-reden (2.5 claimt geen opt-in die er
    // niet hoeft te zijn). De uitschrijfregel staat er altijd onder — als
    // echte link, want footerNote wordt als platte tekst ge-escaped.
    footerNote:
      footerOverride ??
      `You're receiving this because you ticked the box for follow-up tips when scanning ${vars.domain} at branddock.app/brandmd.`,
    footerLink: { href: vars.unsubscribeUrl, label: 'Unsubscribe' },
  });
  const text = [
    subject,
    '',
    ...textLines.filter(Boolean),
    '',
    `Unsubscribe: ${vars.unsubscribeUrl}`,
  ].join('\n');
  return { subject, html, text };
}
