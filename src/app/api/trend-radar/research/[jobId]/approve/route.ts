import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import type { PendingTrend } from '@/lib/trend-radar/researcher';

type RouteParams = { params: Promise<{ jobId: string }> };

/**
 * POST /api/trend-radar/research/[jobId]/approve — Save selected trends from research
 *
 * Body: { selectedIndices: number[] }
 * Saves only the trends at the given indices from pendingTrends.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId } = await params;
  const body = await req.json();
  const selectedIndices: number[] = body.selectedIndices ?? [];

  if (!Array.isArray(selectedIndices) || selectedIndices.length === 0) {
    return NextResponse.json({ error: 'No trends selected' }, { status: 400 });
  }

  // Fetch job with pending trends
  const job = await prisma.trendResearchJob.findFirst({
    where: { id: jobId, workspaceId },
  });

  if (!job) {
    return NextResponse.json({ error: 'Research job not found' }, { status: 404 });
  }

  if (job.status !== 'COMPLETED') {
    return NextResponse.json({ error: 'Research job is not completed' }, { status: 400 });
  }

  const allPending = (job.pendingTrends ?? []) as unknown as PendingTrend[];
  if (allPending.length === 0) {
    return NextResponse.json({ error: 'No pending trends to approve' }, { status: 400 });
  }

  // Select only the trends at the given indices
  const selected = selectedIndices
    .filter((i) => i >= 0 && i < allPending.length)
    .map((i) => allPending[i]);

  if (selected.length === 0) {
    return NextResponse.json({ error: 'No valid trends selected' }, { status: 400 });
  }

  // Save to DB — explicitly map PendingTrend fields to DetectedTrend schema
  await prisma.$transaction(
    selected.map((trend) =>
      prisma.detectedTrend.create({
        data: {
          title: trend.title,
          slug: trend.slug,
          description: trend.description,
          category: trend.category as never,
          scope: trend.scope as never,
          impactLevel: trend.impactLevel as never,
          timeframe: trend.timeframe as never,
          relevanceScore: trend.relevanceScore,
          direction: trend.direction,
          confidence: trend.confidence,
          rawExcerpt: trend.rawExcerpt,
          aiAnalysis: trend.aiAnalysis,
          industries: trend.industries,
          tags: trend.tags,
          howToUse: trend.howToUse,
          sourceUrl: trend.sourceUrl || trend.sourceUrls?.[0] || null,
          sourceUrls: trend.sourceUrls ?? [],
          dataPoints: trend.dataPoints ?? [],
          evidenceCount: trend.evidenceCount ?? 0,
          whyNow: trend.whyNow ?? null,
          scores: trend.scores ? JSON.parse(JSON.stringify(trend.scores)) : null,
          detectionSource: 'AI_RESEARCH',
          workspaceId,
          researchJobId: jobId,
        },
      }),
    ),
  );

  // Clear pending trends and update count
  await prisma.trendResearchJob.update({
    where: { id: jobId },
    data: {
      pendingTrends: Prisma.JsonNull,
      trendsDetected: selected.length,
    },
  });

  // Create notifications for high-relevance trends
  const highRelevance = selected.filter((t) => t.relevanceScore > 80);
  if (highRelevance.length > 0) {
    const workspaceUser = await prisma.user.findFirst({
      where: { workspaceId },
      select: { id: true },
    });

    if (workspaceUser) {
      await prisma.notification.createMany({
        data: highRelevance.map((trend) => ({
          type: 'RESEARCH_INSIGHT_ADDED',
          category: 'RESEARCH',
          title: `New trend detected: ${trend.title}`,
          description: trend.description?.slice(0, 200) ?? 'A new trend was detected by AI Research.',
          actionUrl: 'trends',
          workspaceId,
          userId: workspaceUser.id,
        })),
      });
    }
  }

  return NextResponse.json({
    approved: selected.length,
    total: allPending.length,
  });
}
