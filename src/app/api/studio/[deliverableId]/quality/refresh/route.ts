import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { getMetricsForType } from '@/lib/studio/quality-metrics';

type RouteParams = { params: Promise<{ deliverableId: string }> };

// POST /api/studio/[deliverableId]/quality/refresh — Recalculate quality score
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    const { deliverableId } = await params;

    const deliverable = await prisma.deliverable.findFirst({
      where: {
        id: deliverableId,
        campaign: { workspaceId: workspaceId ?? undefined },
      },
      select: { contentTab: true },
    });

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    // Generate random metrics between 70-95
    const metricNames = getMetricsForType(deliverable.contentTab);
    const metricsObj: Record<string, number> = {};
    let total = 0;

    for (const name of metricNames) {
      const score = Math.floor(Math.random() * 26) + 70; // 70-95
      metricsObj[name] = score;
      total += score;
    }

    const overall = Math.round(total / metricNames.length);

    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        qualityScore: overall,
        qualityMetrics: metricsObj,
      },
    });

    return NextResponse.json({
      overall,
      metrics: metricNames.map((name) => ({
        name,
        score: metricsObj[name],
        maxScore: 100,
      })),
    });
  } catch (error) {
    console.error('POST /api/studio/[deliverableId]/quality/refresh error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
