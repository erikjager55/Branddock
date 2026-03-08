import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { getResearchProgress } from '@/lib/trend-radar/researcher';

type RouteParams = { params: Promise<{ jobId: string }> };

/**
 * GET /api/trend-radar/research/[jobId] — Poll research progress
 *
 * Returns progress for the 5-phase pipeline:
 * generating_queries → discovering_sources → extracting_signals → synthesizing → validating → complete
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
      // Phase 1
      queriesGenerated: inMemory.queriesGenerated,
      urlsTotal: inMemory.urlsTotal,
      urlsCompleted: inMemory.urlsCompleted,
      currentUrl: inMemory.currentUrl,
      // Phase 2
      signalsExtracted: inMemory.signalsExtracted,
      sourcesProcessed: inMemory.sourcesProcessed,
      sourcesTotal: inMemory.sourcesTotal,
      // Phase 3-5
      trendsDetected: inMemory.trendsDetected,
      trendsRejected: inMemory.trendsRejected,
      pendingTrends: inMemory.phase === 'complete' ? inMemory.pendingTrends : undefined,
      errors: inMemory.errors,
      progress: calculateProgress(inMemory.phase, inMemory),
    });
  }

  // Fall back to DB (for completed/failed jobs)
  const job = await prisma.trendResearchJob.findFirst({
    where: { id: jobId, workspaceId },
  });

  if (!job) {
    return NextResponse.json({ error: 'Research job not found' }, { status: 404 });
  }

  const dbPhase = job.status === 'COMPLETED' ? 'complete'
    : job.status === 'FAILED' ? 'failed'
    : job.status === 'CANCELLED' ? 'cancelled'
    : 'discovering_sources';

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    phase: dbPhase,
    queriesGenerated: 0,
    urlsTotal: job.urlsTotal,
    urlsCompleted: job.urlsCompleted,
    currentUrl: null,
    signalsExtracted: 0,
    sourcesProcessed: 0,
    sourcesTotal: 0,
    trendsDetected: job.trendsDetected,
    trendsRejected: 0,
    pendingTrends: job.status === 'COMPLETED' ? job.pendingTrends : undefined,
    errors: job.errors,
    progress: job.status === 'COMPLETED' || job.status === 'FAILED' ? 100
      : job.urlsTotal > 0
        ? Math.round((job.urlsCompleted / job.urlsTotal) * 40) // discovery is ~40% of total
        : 0,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
}

/** Calculate overall progress percentage based on current phase. */
function calculateProgress(
  phase: string,
  state: { urlsTotal: number; urlsCompleted: number; sourcesTotal: number; sourcesProcessed: number },
): number {
  // Phase weights: discover=20%, extract=40%, synthesize=15%, validate=15%, complete=10%
  switch (phase) {
    case 'generating_queries':
      return 5;
    case 'discovering_sources': {
      const urlPct = state.urlsTotal > 0
        ? state.urlsCompleted / state.urlsTotal
        : 0;
      return Math.round(5 + urlPct * 15); // 5-20%
    }
    case 'extracting_signals': {
      const extractPct = state.sourcesTotal > 0
        ? state.sourcesProcessed / state.sourcesTotal
        : 0;
      return Math.round(20 + extractPct * 40); // 20-60%
    }
    case 'synthesizing':
      return 65;
    case 'validating':
      return 80;
    case 'complete':
      return 100;
    case 'failed':
    case 'cancelled':
      return 100;
    default:
      return 0;
  }
}
