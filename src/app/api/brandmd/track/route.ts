// =============================================================
// POST /api/brandmd/track — funnel-events op een draft-profiel
//
// Het token is de capability (alleen de aanvrager heeft het); events
// zetten uitsluitend statusladder-timestamps — DB-gedreven dashboard,
// geen PostHog-afhankelijkheid. `email` is de rapport-laag-gate uit
// touchpoints v2 (partial reveal).
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { parseJsonBody } from '@/lib/api/parse-json-body';
import { trySendTransactional } from '@/lib/email/transactional';
import { renderBrandMdReportEmail } from '@/lib/email/templates/brandmd-report';
import { buildHumanFindings } from '@/lib/brandmd/findings';
import type { BrandMdDraftPayload } from '@/lib/brandmd/scan';
import { encryptToken } from '@/lib/security/token-crypto';
import {
  appBaseUrl,
  claimUrl,
  brandMdUnsubscribeUrl,
  BRAND_MD_USE_HUB_PATH,
} from '@/lib/brandmd/constants';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  token: z.string().min(10).max(200),
  event: z.enum(['downloaded', 'email']),
  email: z.string().email().max(200).optional(),
  /** Vinkje bij de gate (default uit) — expliciete toestemming voor 2.2-2.4. */
  lifecycleOptIn: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, bodySchema);
    if (!parsed.ok) return parsed.response;
    const { token, event, email, lifecycleOptIn } = parsed.data;

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const profile = await prisma.generatedBrandProfile.findUnique({
      where: { claimTokenHash: tokenHash },
      select: {
        id: true,
        status: true,
        downloadedAt: true,
        emailCapturedAt: true,
        lifecycleOptInAt: true,
        brandName: true,
        domain: true,
        score: true,
        scoreBreakdown: true,
        payload: true,
        expiresAt: true,
      },
    });
    if (!profile || profile.status === 'EXPIRED') {
      return NextResponse.json({ error: 'Unknown or expired draft' }, { status: 404 });
    }

    if (event === 'downloaded' && !profile.downloadedAt) {
      await prisma.generatedBrandProfile.update({
        where: { id: profile.id },
        data: { downloadedAt: new Date() },
      });
    }
    if (event === 'email') {
      if (!email) {
        return NextResponse.json({ error: 'Email required for this event' }, { status: 400 });
      }
      const firstCapture = !profile.emailCapturedAt;
      await prisma.generatedBrandProfile.update({
        where: { id: profile.id },
        data: {
          email,
          ...(firstCapture ? { emailCapturedAt: new Date() } : {}),
          // Het rauwe token bestaat alleen in dit request (server-side staat
          // de hash). Versleuteld opslaan is wat de cron later in staat stelt
          // download-/claim-/unsubscribe-links te bouwen. Dat dit veld pas
          // vanaf nu gevuld wordt, is meteen de afbakening: drafts van vóór
          // de fase-2-copy kregen de "one-time email"-belofte en blijven
          // daardoor automatisch buiten de lifecycle-reeks.
          claimTokenEnc: encryptToken(token),
          // Write-once: de opt-in is een toestemmingsmoment, geen toggle.
          // Terugkomen doe je via de unsubscribe-link, niet via een reset.
          ...(lifecycleOptIn && !profile.lifecycleOptInAt
            ? { lifecycleOptInAt: new Date() }
            : {}),
        },
      });
      // Rapport-mail (touchpoint 2.1) — alleen bij de éérste capture, zodat
      // dubbele submits/retries nooit dubbele mails opleveren. Fail-soft:
      // een mail-storing mag de gate (en dus de download) niet blokkeren.
      // De URLs komen uit het rauwe token in dit request — server-side
      // staat alleen de hash, dus dit is het enige moment om ze te bouwen.
      if (firstCapture) {
        const optedIn = Boolean(lifecycleOptIn) || profile.lifecycleOptInAt !== null;
        await sendReportEmail(token, email, profile, optedIn);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/brandmd/track]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface ReportProfileFields {
  brandName: string | null;
  domain: string;
  score: number | null;
  scoreBreakdown: unknown;
  payload: unknown;
  expiresAt: Date;
}

/**
 * Stuurt de rapport-mail (touchpoint 2.1) met exact dezelfde bevindingen
 * en score-uitleg als de resultaatpagina. Fail-soft by design.
 */
async function sendReportEmail(
  rawToken: string,
  email: string,
  profile: ReportProfileFields,
  lifecycleOptedIn: boolean,
): Promise<void> {
  try {
    const base = appBaseUrl();
    if (!base) return;

    const payload = profile.payload as BrandMdDraftPayload | null;
    const dimensions = Array.isArray(profile.scoreBreakdown)
      ? (profile.scoreBreakdown as Array<{ label: string; score: number; explanation: string }>)
      : [];

    const rendered = renderBrandMdReportEmail({
      brandName: profile.brandName ?? profile.domain,
      domain: profile.domain,
      score: profile.score ?? 0,
      findings: payload ? buildHumanFindings(payload) : [],
      dimensions,
      downloadUrl: `${base}/api/brandmd/download?token=${rawToken}`,
      claimUrl: claimUrl(rawToken),
      useHubUrl: `${base}${BRAND_MD_USE_HUB_PATH}`,
      expiresAt: profile.expiresAt,
      lifecycleOptedIn,
      unsubscribeUrl: brandMdUnsubscribeUrl(rawToken),
    });

    const result = await trySendTransactional({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: { flow: 'brandmd-report', domain: profile.domain },
    });
    if (!result.ok) {
      console.error('[brandmd/track] report email failed:', result.error);
    }
  } catch (error) {
    console.error('[brandmd/track] report email failed:', error);
  }
}
