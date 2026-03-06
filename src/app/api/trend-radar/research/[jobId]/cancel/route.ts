import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { cancelResearch } from '@/lib/trend-radar/researcher';

type RouteParams = { params: Promise<{ jobId: string }> };

/**
 * POST /api/trend-radar/research/[jobId]/cancel — Cancel a running research job
 */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId } = await params;

  // Verify job belongs to this workspace
  const job = await prisma.trendResearchJob.findFirst({
    where: { id: jobId, workspaceId },
    select: { id: true },
  });
  if (!job) {
    return NextResponse.json({ error: 'Research job not found' }, { status: 404 });
  }

  const cancelled = cancelResearch(jobId);

  if (!cancelled) {
    return NextResponse.json(
      { error: 'Research job not found or already completed' },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, jobId });
}
