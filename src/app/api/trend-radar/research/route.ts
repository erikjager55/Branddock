import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { runTrendResearch } from '@/lib/trend-radar/researcher';

/**
 * POST /api/trend-radar/research — Start AI research
 * Body: { query: string, useBrandContext?: boolean }
 */
export async function POST(req: NextRequest) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const query = body.query as string | undefined;
  const useBrandContext = body.useBrandContext === true;

  if (!query || query.trim().length < 3) {
    return NextResponse.json(
      { error: 'Query is required (minimum 3 characters)' },
      { status: 400 },
    );
  }

  // Create research job
  const job = await prisma.trendResearchJob.create({
    data: {
      status: 'PENDING',
      query: query.trim(),
      useBrandContext,
      workspaceId,
    },
  });

  // Fire-and-forget research
  runTrendResearch(job.id, workspaceId, query.trim(), useBrandContext).catch((err) => {
    console.error(`[TrendResearch] Job ${job.id} failed:`, err);
    prisma.trendResearchJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        errors: [err instanceof Error ? err.message : 'Unknown error'],
        completedAt: new Date(),
      },
    }).catch(console.error);
  });

  return NextResponse.json(job, { status: 202 });
}
