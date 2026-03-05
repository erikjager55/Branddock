import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { cancelScan } from '@/lib/trend-radar/scanner';

type RouteParams = { params: Promise<{ jobId: string }> };

/**
 * POST /api/trend-radar/scan/[jobId]/cancel — Cancel a running scan
 */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId } = await params;
  const cancelled = cancelScan(jobId);

  if (!cancelled) {
    return NextResponse.json(
      { error: 'Scan not found or already completed' },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, jobId });
}
