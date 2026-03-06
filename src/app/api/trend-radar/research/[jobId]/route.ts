import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { getResearchProgress } from '@/lib/trend-radar/researcher';

type RouteParams = { params: Promise<{ jobId: string }> };

/**
 * GET /api/trend-radar/research/[jobId] — Poll research progress
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId } = await params;

  // Try in-memory progress first (for running jobs)
  const inMemory = getResearchProgress(jobId);
  if (inMemory) {
    return NextResponse.json({
      jobId,
      status: inMemory.cancelled ? 'CANCELLED' : inMemory.phase === 'complete' ? 'COMPLETED' : 'RUNNING',
      phase: inMemory.phase,
      urlsTotal: inMemory.urlsTotal,
      urlsCompleted: inMemory.urlsCompleted,
      currentUrl: inMemory.currentUrl,
      trendsDetected: inMemory.trendsDetected,
      pendingTrends: inMemory.phase === 'complete' ? inMemory.pendingTrends : undefined,
      errors: inMemory.errors,
      progress: inMemory.urlsTotal > 0
        ? Math.round((inMemory.urlsCompleted / inMemory.urlsTotal) * 100)
        : 0,
    });
  }

  // Fall back to DB (for completed/failed jobs)
  const job = await prisma.trendResearchJob.findFirst({
    where: { id: jobId, workspaceId },
  });

  if (!job) {
    return NextResponse.json({ error: 'Research job not found' }, { status: 404 });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    phase: job.status === 'COMPLETED' ? 'complete'
      : job.status === 'FAILED' ? 'failed'
      : job.status === 'CANCELLED' ? 'cancelled'
      : job.urlsCompleted > 0 ? 'analyzing'
      : job.urlsTotal > 0 ? 'scraping'
      : 'generating_urls',
    urlsTotal: job.urlsTotal,
    urlsCompleted: job.urlsCompleted,
    currentUrl: null,
    trendsDetected: job.trendsDetected,
    pendingTrends: job.status === 'COMPLETED' ? job.pendingTrends : undefined,
    errors: job.errors,
    progress: job.status === 'COMPLETED' || job.status === 'FAILED' ? 100
      : job.urlsTotal > 0
        ? Math.round((job.urlsCompleted / job.urlsTotal) * 100)
        : 0,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
}
