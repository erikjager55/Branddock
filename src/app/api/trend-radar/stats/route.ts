import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

/**
 * GET /api/trend-radar/stats — Dashboard statistics
 */
export async function GET() {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [total, activated, newThisWeek, aiResearched] = await Promise.all([
    prisma.detectedTrend.count({
      where: { workspaceId, isDismissed: false },
    }),
    prisma.detectedTrend.count({
      where: { workspaceId, isActivated: true },
    }),
    prisma.detectedTrend.count({
      where: { workspaceId, createdAt: { gte: oneWeekAgo } },
    }),
    prisma.detectedTrend.count({
      where: { workspaceId, detectionSource: 'AI_RESEARCH' },
    }),
  ]);

  return NextResponse.json({
    total,
    activated,
    newThisWeek,
    aiResearched,
  });
}
