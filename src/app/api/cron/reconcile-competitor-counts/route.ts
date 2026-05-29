// =============================================================
// Cron endpoint — reconcile Competitor.unacknowledgedActivityCount
//
// Loopt dagelijks (zie vercel.json) en hercomputeert per competitor
// het aantal unacked CompetitorActivity rows. Corrigeert drift door
// bugs of handmatige DB-edits. Protected via CRON_SECRET.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { isCronAuthorized } from '@/lib/auth/cron-auth';

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
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

      let wsCorrections = 0;
      for (const comp of competitors) {
        const actual = actualMap.get(comp.id) ?? 0;
        if (actual !== comp.unacknowledgedActivityCount) {
          await prisma.competitor.update({
            where: { id: comp.id },
            data: { unacknowledgedActivityCount: actual },
          });
          wsCorrections += 1;
        }
      }

      // Bust the workspace's competitor + dashboard caches once per workspace so a
      // corrected count is not served stale until TTL (verboden-patroon #10).
      if (wsCorrections > 0) {
        invalidateCache(cacheKeys.prefixes.competitors(ws.id));
        invalidateCache(cacheKeys.prefixes.dashboard(ws.id));
        correctionsApplied += wsCorrections;
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
