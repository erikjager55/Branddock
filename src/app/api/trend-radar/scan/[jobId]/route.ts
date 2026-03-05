import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { getScanProgress } from '@/lib/trend-radar/scanner';

type RouteParams = { params: Promise<{ jobId: string }> };

/**
 * GET /api/trend-radar/scan/[jobId] — Poll scan progress
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId } = await params;

  // Try in-memory progress first (for running scans)
  const inMemory = getScanProgress(jobId);
  if (inMemory) {
    return NextResponse.json({
      jobId,
      status: 'RUNNING',
      sourcesTotal: inMemory.sourcesTotal,
      sourcesCompleted: inMemory.sourcesCompleted,
      currentSource: inMemory.currentSource,
      trendsDetected: inMemory.trendsDetected,
      errors: inMemory.errors,
      progress: inMemory.sourcesTotal > 0
        ? Math.round((inMemory.sourcesCompleted / inMemory.sourcesTotal) * 100)
        : 0,
    });
  }

  // Fall back to DB (for completed/failed scans)
  const job = await prisma.trendScanJob.findFirst({
    where: { id: jobId, workspaceId },
  });

  if (!job) {
    return NextResponse.json({ error: 'Scan job not found' }, { status: 404 });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    sourcesTotal: job.sourcesTotal,
    sourcesCompleted: job.sourcesCompleted,
    currentSource: null,
    trendsDetected: job.trendsDetected,
    errors: job.errors,
    progress: job.status === 'COMPLETED' || job.status === 'FAILED' ? 100
      : job.sourcesTotal > 0
        ? Math.round((job.sourcesCompleted / job.sourcesTotal) * 100)
        : 0,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
}

/**
 * POST /api/trend-radar/scan/[jobId]/cancel — Cancel a running scan
 * Note: Next.js doesn't support nested dynamic route files in same folder,
 * so cancel is handled via query param or separate route.
 * We handle it via the scan/[jobId] DELETE or a dedicated cancel route.
 */
