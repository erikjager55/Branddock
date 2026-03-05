import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { runTrendScan } from '@/lib/trend-radar/scanner';

/**
 * POST /api/trend-radar/scan — Start a new trend scan
 * Optional body: { sourceId } to scan a single source
 */
export async function POST(req: NextRequest) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const sourceId = body.sourceId as string | undefined;

  // Create scan job
  const job = await prisma.trendScanJob.create({
    data: {
      status: 'PENDING',
      trendSourceId: sourceId || null,
      workspaceId,
    },
  });

  // Fire-and-forget scan
  runTrendScan(job.id, workspaceId, sourceId).catch((err) => {
    console.error(`[TrendScan] Job ${job.id} failed:`, err);
    prisma.trendScanJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        errors: [err instanceof Error ? err.message : 'Unknown error'],
        completedAt: new Date(),
      },
    }).catch(console.error);
  });

  return NextResponse.json({
    jobId: job.id,
    status: 'PENDING',
  }, { status: 202 });
}
