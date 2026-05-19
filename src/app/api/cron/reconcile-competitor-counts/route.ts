// =============================================================
// Cron endpoint — reconcile Competitor.unacknowledgedActivityCount
//
// Loopt dagelijks (zie vercel.json) en hercomputeert per competitor
// het aantal unacked CompetitorActivity rows. Corrigeert drift door
// bugs of handmatige DB-edits. Protected via CRON_SECRET.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const workspaces = await prisma.workspace.findMany({ select: { id: true } });
    let correctionsApplied = 0;

    for (const ws of workspaces) {
      const competitors = await prisma.competitor.findMany({
        where: { workspaceId: ws.id },
        select: { id: true, unacknowledgedActivityCount: true },
      });
      if (competitors.length === 0) continue;

      const grouped = await prisma.competitorActivity.groupBy({
        by: ['competitorId'],
        _count: { _all: true },
        where: { workspaceId: ws.id, acknowledgedAt: null },
      });
      const actualMap = new Map<string, number>(
        grouped.map((g) => [g.competitorId, g._count._all]),
      );

      for (const comp of competitors) {
        const actual = actualMap.get(comp.id) ?? 0;
        if (actual !== comp.unacknowledgedActivityCount) {
          await prisma.competitor.update({
            where: { id: comp.id },
            data: { unacknowledgedActivityCount: actual },
          });
          correctionsApplied += 1;
        }
      }
    }

    return NextResponse.json({
      workspacesProcessed: workspaces.length,
      correctionsApplied,
    });
  } catch (error) {
    console.error('[GET /api/cron/reconcile-competitor-counts]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
