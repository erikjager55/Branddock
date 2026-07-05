// =============================================================================
// POST /api/media/backfill-tags — F41-bis (audit 2026-05-13)
//
// Backfill DAM auto-tagging voor bestaande MediaAssets die nog geen aiTags
// hebben. Loopt over de eerste N untagged IMAGE-assets en fired
// tagMediaAssetIfPossible per asset. Fire-and-forget — endpoint retourneert
// direct na queuen.
//
// Body: { limit?: number (max 50, default 20) }
// =============================================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { dispatchJob } from '@/lib/agents/jobs/dispatch';

const bodySchema = z.object({ limit: z.number().int().min(1).max(50).optional() });

export async function POST(request: Request) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let limit = 20;
    try {
      const body = bodySchema.parse(await request.json());
      if (body.limit) limit = body.limit;
    } catch {
      // empty body / parse-fail → default 20
    }

    const untagged = await prisma.mediaAsset.findMany({
      where: {
        workspaceId,
        mediaType: 'IMAGE',
        OR: [{ aiTags: { isEmpty: true } }, { aiTags: { equals: [] } }],
      },
      select: { id: true },
      take: limit,
    });

    // Serverless-safe: op de queue i.p.v. fire-and-forget (Vercel kilt post-response).
    await Promise.all(
      untagged.map((a) =>
        dispatchJob({ type: 'DAM_AUTO_TAG', payload: { assetId: a.id }, triggeredBy: 'user' }),
      ),
    );

    return NextResponse.json({
      queued: untagged.length,
      note: 'Tags worden async geschreven; check Media Library na 30-60s.',
    });
  } catch (err) {
    console.error('[POST /api/media/backfill-tags]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
