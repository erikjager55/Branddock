import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { computeSnapshotDiff, shortSummary } from '@/lib/brandstyle/snapshots/snapshot-diff';
import type { SnapshotSummary } from '@/lib/brandstyle/snapshots/types';

// =============================================================
// GET /api/brandstyle/snapshots
//
// Lijst van snapshots voor de actieve workspace's brandstyle, in
// reverse-chronologische volgorde. Bevat een pre-computed
// changeSummary per rij zodat de UI niet voor elke rij apart een
// diff hoeft op te vragen.
// =============================================================

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const styleguide = await prisma.brandStyleguide.findFirst({
      where: { workspaceId },
      select: { id: true },
    });
    if (!styleguide) {
      return NextResponse.json({ snapshots: [] });
    }

    const rows = await prisma.brandstyleSnapshot.findMany({
      where: { brandstyleId: styleguide.id },
      orderBy: { capturedAt: 'desc' },
      select: {
        id: true,
        capturedAt: true,
        tokensHash: true,
        triggerSource: true,
        notes: true,
        triggeredBy: { select: { id: true, name: true } },
        tokensJson: true,
      },
    });

    const snapshots: SnapshotSummary[] = rows.map((row, idx) => {
      const next = rows[idx];
      const prev = rows[idx + 1];
      let changeSummary: string | null = null;
      let changeCount = 0;
      if (prev) {
        const diff = computeSnapshotDiff(
          { capturedAt: prev.capturedAt.toISOString(), tokensJson: prev.tokensJson },
          { capturedAt: next.capturedAt.toISOString(), tokensJson: next.tokensJson },
        );
        if (!diff.isTrivial) {
          changeSummary = shortSummary(diff);
          changeCount =
            diff.colors.filter((c) => !c.cosmetic).length +
            diff.typography.length +
            diff.rounded.length +
            diff.spacing.length +
            diff.elevation.length +
            diff.components.length;
        }
      }
      return {
        id: row.id,
        capturedAt: row.capturedAt.toISOString(),
        tokensHash: row.tokensHash,
        triggerSource: row.triggerSource as SnapshotSummary['triggerSource'],
        triggeredBy: row.triggeredBy ? { id: row.triggeredBy.id, name: row.triggeredBy.name } : null,
        notes: row.notes,
        changeSummary,
        changeCount,
      };
    });

    return NextResponse.json({ snapshots });
  } catch (err) {
    console.error('[GET /api/brandstyle/snapshots]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
