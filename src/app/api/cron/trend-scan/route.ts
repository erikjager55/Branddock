import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runTrendScan } from '@/lib/trend-radar/scanner';

/**
 * GET /api/cron/trend-scan — Vercel Cron endpoint (every 6 hours)
 *
 * Protected via CRON_SECRET header.
 * Scans all workspaces with active sources where nextCheckAt <= now().
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find all workspaces with active sources due for scanning
  const dueWorkspaces = await prisma.trendSource.findMany({
    where: {
      isActive: true,
      OR: [
        { nextCheckAt: null },
        { nextCheckAt: { lte: new Date() } },
      ],
    },
    select: { workspaceId: true },
    distinct: ['workspaceId'],
  });

  const workspaceIds = dueWorkspaces.map((s) => s.workspaceId);

  if (workspaceIds.length === 0) {
    return NextResponse.json({
      message: 'No workspaces with due sources',
      scansStarted: 0,
    });
  }

  // Start a scan job per workspace
  const jobs = [];
  for (const workspaceId of workspaceIds) {
    const job = await prisma.trendScanJob.create({
      data: {
        status: 'PENDING',
        workspaceId,
      },
    });

    // Fire-and-forget
    runTrendScan(job.id, workspaceId).catch((err) => {
      console.error(`[CronTrendScan] Job ${job.id} (workspace ${workspaceId}) failed:`, err);
      prisma.trendScanJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errors: [err instanceof Error ? err.message : 'Unknown error'],
          completedAt: new Date(),
        },
      }).catch(console.error);
    });

    jobs.push({ jobId: job.id, workspaceId });
  }

  return NextResponse.json({
    message: `Started ${jobs.length} scan(s)`,
    scansStarted: jobs.length,
    jobs,
  });
}
