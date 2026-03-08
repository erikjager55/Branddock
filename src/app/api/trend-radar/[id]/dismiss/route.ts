import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/trend-radar/[id]/dismiss — Toggle trend dismissal
 */
export async function PATCH(_req: NextRequest, { params }: RouteParams) {
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

  const isDismissed = !existing.isDismissed;

  const trend = await prisma.detectedTrend.update({
    where: { id },
    data: {
      isDismissed,
      dismissedAt: isDismissed ? new Date() : null,
      // Deactivate if dismissing
      isActivated: isDismissed ? false : existing.isActivated,
      activatedAt: isDismissed ? null : existing.activatedAt,
      activatedById: isDismissed ? null : existing.activatedById,
    },
    include: {
      researchJob: { select: { id: true, query: true } },
      activatedBy: { select: { id: true, name: true } },
    },
  });

  invalidateCache(cacheKeys.prefixes.trendRadar(workspaceId));

  return NextResponse.json(trend);
}
