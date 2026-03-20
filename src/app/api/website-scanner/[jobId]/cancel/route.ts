import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { cancelScan } from '@/lib/website-scanner/scanner-pipeline';

type RouteParams = { params: Promise<{ jobId: string }> };

/**
 * POST /api/website-scanner/[jobId]/cancel — Cancel a running scan.
 */
export async function POST(
  _request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const { jobId } = await params;

    // Verify ownership
    const scan = await prisma.websiteScan.findFirst({
      where: { id: jobId, workspaceId },
      select: { id: true },
    });

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    const cancelled = cancelScan(jobId);

    if (!cancelled) {
      // Not in memory (already completed or never started) — try DB update directly
      await prisma.websiteScan.update({
        where: { id: jobId },
        data: { status: 'CANCELLED', completedAt: new Date() },
      });
    }

    return NextResponse.json({ success: true, jobId });
  } catch (error) {
    console.error('[POST /api/website-scanner/:jobId/cancel]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
