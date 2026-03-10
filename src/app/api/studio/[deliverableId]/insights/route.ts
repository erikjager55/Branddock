import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

type RouteParams = { params: Promise<{ deliverableId: string }> };

// GET /api/studio/[deliverableId]/insights — List activated trends for content studio
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    const { deliverableId } = await params;

    // Verify deliverable belongs to workspace
    const deliverable = await prisma.deliverable.findFirst({
      where: {
        id: deliverableId,
        campaign: { workspaceId: workspaceId ?? undefined },
      },
      select: { id: true },
    });

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    // Fetch activated trends from the workspace
    const trends = await prisma.detectedTrend.findMany({
      where: {
        workspaceId: workspaceId ?? undefined,
        isActivated: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        detectionSource: true,
        category: true,
        impactLevel: true,
        scope: true,
        timeframe: true,
        relevanceScore: true,
        whyNow: true,
      },
      orderBy: { relevanceScore: 'desc' },
    });

    return NextResponse.json({
      insights: trends.map((trend) => ({
        id: trend.id,
        title: trend.title,
        description: trend.description,
        source: trend.detectionSource,
        category: trend.category,
        impactLevel: trend.impactLevel,
        scope: trend.scope,
        timeframe: trend.timeframe,
        relevanceScore: trend.relevanceScore,
        whyNow: trend.whyNow,
      })),
    });
  } catch (error) {
    console.error('GET /api/studio/[deliverableId]/insights error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
