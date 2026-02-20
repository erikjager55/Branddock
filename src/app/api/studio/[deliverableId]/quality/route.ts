import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { getMetricsForType } from '@/lib/studio/quality-metrics';

type RouteParams = { params: Promise<{ deliverableId: string }> };

// GET /api/studio/[deliverableId]/quality — Return quality score + metrics
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    const { deliverableId } = await params;

    const deliverable = await prisma.deliverable.findFirst({
      where: {
        id: deliverableId,
        campaign: { workspaceId: workspaceId ?? undefined },
      },
      select: {
        qualityScore: true,
        qualityMetrics: true,
        contentTab: true,
      },
    });

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    // If qualityMetrics exist, use them
    if (deliverable.qualityMetrics) {
      const metricsObj = deliverable.qualityMetrics as Record<string, number>;
      const metricNames = Object.keys(metricsObj);
      return NextResponse.json({
        overall: deliverable.qualityScore ?? 75,
        metrics: metricNames.map((name) => ({
          name,
          score: metricsObj[name],
          maxScore: 100,
        })),
      });
    }

    // Return stub metrics for the content type
    const metricNames = getMetricsForType(deliverable.contentTab);
    return NextResponse.json({
      overall: deliverable.qualityScore ?? 75,
      metrics: metricNames.map((name) => ({
        name,
        score: 75,
        maxScore: 100,
      })),
    });
  } catch (error) {
    console.error('GET /api/studio/[deliverableId]/quality error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
