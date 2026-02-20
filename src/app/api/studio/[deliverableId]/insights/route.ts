import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

type RouteParams = { params: Promise<{ deliverableId: string }> };

// GET /api/studio/[deliverableId]/insights — List available market insights
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

    // Fetch market insights from the workspace
    const insights = await prisma.marketInsight.findMany({
      where: {
        workspaceId: workspaceId ?? undefined,
      },
      select: {
        id: true,
        title: true,
        source: true,
        category: true,
        relevanceScore: true,
      },
      orderBy: { relevanceScore: 'desc' },
    });

    return NextResponse.json({
      insights: insights.map((insight) => ({
        id: insight.id,
        title: insight.title,
        source: insight.source,
        category: insight.category,
        relevanceScore: insight.relevanceScore,
      })),
    });
  } catch (error) {
    console.error('GET /api/studio/[deliverableId]/insights error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
