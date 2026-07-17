import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { parseJsonBody } from '@/lib/api/parse-json-body';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

type RouteParams = { params: Promise<{ id: string }> };

// L8 Zod-sweep (audit 2026-06-26, batch 2): de PATCH kopieerde allowlist-keys
// met ongetypeerde waarden in prisma.update — de enum-velden zijn Prisma-enums
// (ongeldige waarde 500'de). Zelfde caps als trend-radar/manual.
const strArray = z.array(z.string().max(500)).max(100);
const updateTrendSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).nullish(),
  category: z
    .enum(['CONSUMER_BEHAVIOR', 'TECHNOLOGY', 'MARKET_DYNAMICS', 'COMPETITIVE', 'REGULATORY'])
    .optional(),
  scope: z.enum(['MICRO', 'MESO', 'MACRO']).optional(),
  impactLevel: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  timeframe: z.enum(['SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM']).optional(),
  relevanceScore: z.number().min(0).max(100).optional(),
  direction: z.string().max(50).nullish(),
  industries: strArray.optional(),
  tags: strArray.optional(),
  howToUse: z.array(z.string().max(2000)).max(100).optional(),
  sourceUrl: z.string().max(2000).nullish(),
  imageUrl: z.string().max(2000).nullish(),
});

/**
 * GET /api/trend-radar/[id] — Get trend detail
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const trend = await prisma.detectedTrend.findFirst({
      where: { id, workspaceId },
      include: {
        researchJob: { select: { id: true, query: true } },
        activatedBy: { select: { id: true, name: true } },
        lockedBy: { select: { id: true, name: true } },
      },
    });

    if (!trend) {
      return NextResponse.json({ error: 'Trend not found' }, { status: 404 });
    }

    return NextResponse.json(trend);
  } catch (error) {
    console.error('[GET /api/trend-radar/[id]]', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/trend-radar/[id] — Update trend fields
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const parsed = await parseJsonBody(req, updateTrendSchema);
    if (!parsed.ok) return parsed.response;

    // Verify ownership
    const existing = await prisma.detectedTrend.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Trend not found' }, { status: 404 });
    }

    if (existing.isLocked) {
      return NextResponse.json({ error: 'Trend is locked' }, { status: 423 });
    }

    // Alleen meegestuurde velden updaten (null blijft betekenisvol als "leegmaken").
    const data = Object.fromEntries(
      Object.entries(parsed.data).filter(([, value]) => value !== undefined),
    );

    const trend = await prisma.detectedTrend.update({
      where: { id },
      data,
      include: {
        researchJob: { select: { id: true, query: true } },
        activatedBy: { select: { id: true, name: true } },
        lockedBy: { select: { id: true, name: true } },
      },
    });

    invalidateCache(cacheKeys.prefixes.trendRadar(workspaceId));

    return NextResponse.json(trend);
  } catch (error) {
    console.error('[PATCH /api/trend-radar/[id]]', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trend-radar/[id] — Delete trend
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.detectedTrend.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Trend not found' }, { status: 404 });
    }

    if (existing.isLocked) {
      return NextResponse.json({ error: 'Trend is locked' }, { status: 423 });
    }

    await prisma.detectedTrend.delete({ where: { id } });

    invalidateCache(cacheKeys.prefixes.trendRadar(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/trend-radar/[id]]', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
