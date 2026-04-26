// =============================================================
// Snapshot Cleanup
//
// Retention policy: bewaar de laatste N snapshots per styleguide,
// PLUS alles binnen `gracePeriodDays` ongeacht count. Combinatie
// houdt korte-termijn velocity zichtbaar (alle scans van afgelopen
// 90 dagen) en lange-termijn merken-evolutie traceer­baar (laatste
// 24 ongeacht datum).
//
// Bedoeld om te draaien als periodieke job — kan triggered worden
// vanuit /api/cron/run-jobs (zie src/lib/agents/jobs/runner.ts) of
// handmatig vanuit een script.
// =============================================================

import { prisma } from '@/lib/prisma';

const DEFAULT_KEEP_COUNT = 24;
const DEFAULT_GRACE_DAYS = 90;

export interface CleanupOptions {
  /** Aantal recente snapshots dat altijd bewaard wordt, ongeacht datum.
   *  Default 24 — voldoende voor jaarlijks audit zonder DB te bloaten. */
  keepCount?: number;
  /** Snapshots binnen dit aantal dagen worden ALTIJD bewaard, ook als
   *  ze buiten de keepCount-window vallen. Default 90 dagen. */
  gracePeriodDays?: number;
  /** Beperk cleanup tot één specifieke brandstyle. Anders: alle. */
  brandstyleId?: string;
}

export interface CleanupResult {
  brandstylesProcessed: number;
  snapshotsDeleted: number;
  snapshotsKept: number;
}

export async function cleanupSnapshots(options: CleanupOptions = {}): Promise<CleanupResult> {
  const keepCount = options.keepCount ?? DEFAULT_KEEP_COUNT;
  const gracePeriodDays = options.gracePeriodDays ?? DEFAULT_GRACE_DAYS;
  const graceCutoff = new Date(Date.now() - gracePeriodDays * 24 * 60 * 60 * 1000);

  // Haal alle styleguides op (of één specifieke).
  const brandstyles = options.brandstyleId
    ? await prisma.brandStyleguide.findMany({
        where: { id: options.brandstyleId },
        select: { id: true },
      })
    : await prisma.brandStyleguide.findMany({ select: { id: true } });

  let totalDeleted = 0;
  let totalKept = 0;

  for (const sg of brandstyles) {
    const snapshots = await prisma.brandstyleSnapshot.findMany({
      where: { brandstyleId: sg.id },
      orderBy: { capturedAt: 'desc' },
      select: { id: true, capturedAt: true },
    });

    if (snapshots.length <= keepCount) {
      totalKept += snapshots.length;
      continue;
    }

    // Eerste keepCount altijd bewaren (newest first).
    const protectedByCount = new Set(snapshots.slice(0, keepCount).map((s) => s.id));
    // Alles binnen grace period ook bewaren.
    const protectedByGrace = new Set(
      snapshots.filter((s) => s.capturedAt >= graceCutoff).map((s) => s.id),
    );

    const toDelete = snapshots
      .filter((s) => !protectedByCount.has(s.id) && !protectedByGrace.has(s.id))
      .map((s) => s.id);

    if (toDelete.length > 0) {
      await prisma.brandstyleSnapshot.deleteMany({
        where: { id: { in: toDelete } },
      });
      totalDeleted += toDelete.length;
    }
    totalKept += snapshots.length - toDelete.length;
  }

  return {
    brandstylesProcessed: brandstyles.length,
    snapshotsDeleted: totalDeleted,
    snapshotsKept: totalKept,
  };
}
