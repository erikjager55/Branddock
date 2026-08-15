// =============================================================
// GET|POST /api/brandmd/unsubscribe?token=… — lifecycle-mails stoppen
//
// Zelfde capability-model als de download-route: het rauwe token uit de
// mail wordt gehasht en tegen `claimTokenHash` opgezocht — server-side
// staat nooit een rauw token. Zet `lifecycleOptOutAt` write-once; de
// cron slaat 2.2-2.4 daarna over (2.5 is een service-bericht over
// opgeslagen data en blijft, zie de cron-route).
//
// Twee methodes, bewust:
//   GET  — de zichtbare "Unsubscribe"-link in de footer (klik → pagina).
//   POST — RFC 8058 one-click, aangekondigd via de headers
//          `List-Unsubscribe` + `List-Unsubscribe-Post` die de cron zet.
//          Gmail/Outlook tonen dan hun eigen unsubscribe-knop en doen een
//          POST zonder dat de gebruiker onze pagina ooit ziet.
//
// Dat een GET muteert is hier een bewuste keuze: een link-prefetch die
// per ongeluk uitschrijft faalt naar "minder mail", niet naar meer.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type OptOutResult =
  | { ok: true; domain: string }
  | { ok: false; status: 400 | 404; error: string };

async function applyOptOut(request: NextRequest): Promise<OptOutResult> {
  const token = new URL(request.url).searchParams.get('token');
  if (!token || token.length < 10) {
    return { ok: false, status: 400, error: 'Missing token' };
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const profile = await prisma.generatedBrandProfile.findUnique({
    where: { claimTokenHash: tokenHash },
    select: { id: true, domain: true, lifecycleOptOutAt: true },
  });
  if (!profile) {
    return { ok: false, status: 404, error: 'Unknown link' };
  }

  // Write-once: de eerste uitschrijving is het moment dat telt. Een
  // tweede klik (of een provider die GET én POST doet) mag de datum
  // niet verschuiven.
  if (!profile.lifecycleOptOutAt) {
    await prisma.generatedBrandProfile.update({
      where: { id: profile.id },
      data: { lifecycleOptOutAt: new Date() },
    });
  }

  return { ok: true, domain: profile.domain };
}

export async function GET(request: NextRequest) {
  try {
    const result = await applyOptOut(request);
    if (!result.ok) {
      return htmlResponse(
        result.status,
        'Link not recognised',
        `This unsubscribe link is no longer valid — the draft it belonged to may already have expired. You will not receive further tips about it.`,
      );
    }
    return htmlResponse(
      200,
      'You are unsubscribed',
      `No more follow-up tips about your ${result.domain} scan. You may still get one final service notice before the stored draft expires — that one is about your data, not marketing.`,
    );
  } catch (error) {
    console.error('[GET /api/brandmd/unsubscribe]', error);
    return htmlResponse(500, 'Something went wrong', 'Please try the link again in a moment.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await applyOptOut(request);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/brandmd/unsubscribe]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Zelfstandige bevestigingspagina — geen SPA-shell, geen auth, geen JS. */
function htmlResponse(status: number, heading: string, message: string): Response {
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(heading)} · Branddock</title>
</head>
<body style="margin:0;padding:48px 16px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
    <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:600;color:#1F2937;">${escapeHtml(heading)}</h1>
    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(message)}</p>
    <a href="https://branddock.app/brandmd" style="display:inline-block;background:#07E5AB;color:#0B3B2E;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:700;text-decoration:none;">Back to the generator</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
