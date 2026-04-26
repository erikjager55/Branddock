import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { computeSnapshotDiff, summarizeDiff, shortSummary } from '@/lib/brandstyle/snapshots/snapshot-diff';

interface RouteContext {
  params: Promise<{ id: string; otherId: string }>;
}

// =============================================================
// GET /api/brandstyle/snapshots/[id]/diff/[otherId]
//
// Computes structural diff tussen twee snapshots. De caller bepaalt
// welke richting (id = "from", otherId = "to"). Beide moeten in
// dezelfde workspace zitten.
//
// Query params:
//   ?includeCosmetic=true  → include RGB-delta-<3 changes in summary
// =============================================================

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }
    const { id, otherId } = await ctx.params;
    const url = new URL(req.url);
    const includeCosmetic = url.searchParams.get('includeCosmetic') === 'true';

    const [from, to] = await Promise.all([
      prisma.brandstyleSnapshot.findFirst({
        where: { id, workspaceId },
        select: { id: true, capturedAt: true, tokensJson: true },
      }),
      prisma.brandstyleSnapshot.findFirst({
        where: { id: otherId, workspaceId },
        select: { id: true, capturedAt: true, tokensJson: true },
      }),
    ]);

    if (!from || !to) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    const diff = computeSnapshotDiff(
      { capturedAt: from.capturedAt.toISOString(), tokensJson: from.tokensJson },
      { capturedAt: to.capturedAt.toISOString(), tokensJson: to.tokensJson },
    );

    return NextResponse.json({
      from: { id: from.id, capturedAt: from.capturedAt.toISOString() },
      to: { id: to.id, capturedAt: to.capturedAt.toISOString() },
      diff,
      summary: summarizeDiff(diff, { includeCosmetic }),
      shortSummary: shortSummary(diff),
    });
  } catch (err) {
    console.error('[GET /api/brandstyle/snapshots/[id]/diff/[otherId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
