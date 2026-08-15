// =============================================================
// GET /api/brandmd/download?token=… — het bestand ophalen
//
// Harde e-mail-gate (user-besluit 2026-08-14, HubSpot-stijl): het
// bestand wordt alleen geleverd als er een e-mailadres op het draft
// is vastgelegd (via /api/brandmd/track event=email). Server-side
// afgedwongen — de generate-response bevat het bestand niet meer.
// Zet downloadedAt (statusladder) bij eerste levering.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get('token');
    if (!token || token.length < 10) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const profile = await prisma.generatedBrandProfile.findUnique({
      where: { claimTokenHash: tokenHash },
      select: {
        id: true,
        status: true,
        domain: true,
        email: true,
        fileContent: true,
        downloadedAt: true,
        expiresAt: true,
      },
    });
    if (!profile || profile.status === 'EXPIRED' || profile.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Unknown or expired draft' }, { status: 404 });
    }
    if (!profile.email) {
      return NextResponse.json(
        { error: 'Enter your email to download your file', code: 'EMAIL_REQUIRED' },
        { status: 403 },
      );
    }

    if (!profile.downloadedAt) {
      await prisma.generatedBrandProfile.update({
        where: { id: profile.id },
        data: { downloadedAt: new Date() },
      });
    }

    return new Response(profile.fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        // Canonieke naam per spec 0.3 (uppercase, exact) — geen rename-stap
        // nodig voor "drop it in your repo root".
        'Content-Disposition': 'attachment; filename="BRAND.md"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[GET /api/brandmd/download]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
