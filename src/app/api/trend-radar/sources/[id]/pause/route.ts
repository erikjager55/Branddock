import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/trend-radar/sources/[id]/pause — Toggle source active/paused
 */
export async function PATCH(_req: NextRequest, { params }: RouteParams) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.trendSource.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }

  const isActive = !existing.isActive;

  const source = await prisma.trendSource.update({
    where: { id },
    data: {
      isActive,
      status: isActive ? 'PENDING' : 'PAUSED',
      nextCheckAt: isActive ? new Date() : null,
    },
    include: {
      _count: { select: { detectedTrends: true } },
    },
  });

  return NextResponse.json(source);
}
