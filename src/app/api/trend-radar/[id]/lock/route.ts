import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/trend-radar/[id]/lock — Lock/unlock a trend
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.detectedTrend.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Trend not found' }, { status: 404 });
    }

    const body = await request.json();
    const { locked } = body;

    if (typeof locked !== 'boolean') {
      return NextResponse.json({ error: 'locked must be a boolean' }, { status: 400 });
    }

    const trend = await prisma.detectedTrend.update({
      where: { id },
      data: {
        isLocked: locked,
        lockedById: locked ? session.user.id : null,
        lockedAt: locked ? new Date() : null,
      },
      include: {
        lockedBy: { select: { id: true, name: true } },
      },
    });

    invalidateCache(cacheKeys.prefixes.trendRadar(workspaceId));

    return NextResponse.json({
      isLocked: trend.isLocked,
      lockedAt: trend.lockedAt?.toISOString() ?? null,
      lockedBy: trend.lockedBy ?? null,
    });
  } catch (error) {
    console.error('[PATCH /api/trend-radar/:id/lock]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
