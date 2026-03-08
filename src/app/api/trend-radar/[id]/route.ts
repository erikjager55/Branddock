import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

type RouteParams = { params: Promise<{ id: string }> };

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
    const body = await req.json();

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

    const allowedFields = [
      'title', 'description', 'category', 'scope', 'impactLevel',
      'timeframe', 'relevanceScore', 'direction', 'industries',
      'tags', 'howToUse', 'sourceUrl',
    ];

    const data: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) data[key] = body[key];
    }

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
