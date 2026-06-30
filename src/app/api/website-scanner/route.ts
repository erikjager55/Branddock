import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { startScanPipeline } from '@/lib/website-scanner/scanner-pipeline';
import { checkGenericRateLimit } from '@/lib/ai/rate-limiter';

// Each scan triggers a full outbound fetch pipeline — cap per workspace so an
// account can't hammer the scanner (DoS / SSRF-probe amplification).
const SCAN_MAX_PER_WINDOW = 10;
const SCAN_WINDOW_MS = 60_000;

/**
 * POST /api/website-scanner — Start a new website scan.
 * Fire-and-forget: returns immediately with scan ID, runs pipeline in background.
 */
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rate = await checkGenericRateLimit(`website-scan:${workspaceId}`, SCAN_MAX_PER_WINDOW, SCAN_WINDOW_MS);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before starting another scan.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rate.resetAt.getTime() - Date.now()) / 1000)) } },
      );
    }

    const userId = session.user.id;
    const body = await request.json().catch(() => ({}));
    const url = body.url as string | undefined;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Create scan record
    const scan = await prisma.websiteScan.create({
      data: {
        url,
        workspaceId,
        createdById: userId,
        status: 'PENDING',
      },
    });

    // Fire-and-forget: start pipeline in background
    startScanPipeline(scan.id, url, workspaceId, userId).catch((err) => {
      console.error(`[website-scanner] Pipeline failed for scan ${scan.id}:`, err);
    });

    return NextResponse.json(
      { id: scan.id, status: 'PENDING' },
      { status: 202 },
    );
  } catch (error) {
    console.error('[POST /api/website-scanner]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
