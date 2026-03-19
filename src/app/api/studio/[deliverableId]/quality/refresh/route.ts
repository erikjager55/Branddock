import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { scoreContentQuality } from '@/lib/studio/quality-scorer';
import { buildGenerationContext } from '@/lib/studio/context-builder';

type RouteParams = { params: Promise<{ deliverableId: string }> };

// POST /api/studio/[deliverableId]/quality/refresh — Score content with AI
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { deliverableId } = await params;

    const deliverable = await prisma.deliverable.findFirst({
      where: {
        id: deliverableId,
        campaign: { workspaceId },
      },
      include: {
        campaign: {
          select: {
            workspaceId: true,
            title: true,
            campaignGoalType: true,
            strategy: true,
          },
        },
      },
    });

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    const content = deliverable.generatedText;
    if (!content || content.trim().length < 50) {
      return NextResponse.json({
        overall: 0,
        metrics: [],
        summary: 'No content to evaluate. Generate content first.',
      });
    }

    // Build context for quality evaluation
    const context = await buildGenerationContext(
      deliverable.campaign.workspaceId,
      [],
      {
        campaignTitle: deliverable.campaign.title,
        campaignGoalType: deliverable.campaign.campaignGoalType,
        strategy: deliverable.campaign.strategy as Record<string, unknown> | null,
      },
      deliverable.title,
    );

    // Score content with AI
    const result = await scoreContentQuality(
      content,
      context,
      deliverable.contentType,
      deliverable.title,
      workspaceId,
    );

    // Save scores to database
    const metricsObj: Record<string, number> = {};
    for (const dim of result.dimensions) {
      metricsObj[dim.name] = dim.score;
    }

    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        qualityScore: result.overall,
        qualityMetrics: metricsObj,
      },
    });

    return NextResponse.json({
      overall: result.overall,
      metrics: result.dimensions.map((d) => ({
        name: d.name,
        score: d.score,
        maxScore: 100,
      })),
      summary: result.summary,
    });
  } catch (error) {
    console.error('POST /api/studio/[deliverableId]/quality/refresh error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
