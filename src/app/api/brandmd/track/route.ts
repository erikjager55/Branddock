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

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  token: z.string().min(10).max(200),
  event: z.enum(['downloaded', 'email']),
  email: z.string().email().max(200).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, bodySchema);
    if (!parsed.ok) return parsed.response;
    const { token, event, email } = parsed.data;

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const profile = await prisma.generatedBrandProfile.findUnique({
      where: { claimTokenHash: tokenHash },
      select: { id: true, status: true, downloadedAt: true, emailCapturedAt: true },
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
      await prisma.generatedBrandProfile.update({
        where: { id: profile.id },
        data: {
          email,
          ...(profile.emailCapturedAt ? {} : { emailCapturedAt: new Date() }),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/brandmd/track]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
