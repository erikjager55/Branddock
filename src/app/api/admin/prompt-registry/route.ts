import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { requireDeveloper } from '@/lib/developer-access';

/**
 * GET /api/admin/prompt-registry
 *
 * List all unique AI-call source identifiers (= prompt-templates) used in
 * this workspace, with aggregate stats: total calls, unique content-hashes,
 * latest call timestamp, average latency, total tokens, error rate.
 *
 * Stats are joined from AICallSnapshot + AICallTrace + LearningEvent.
 *
 * Developer-only (Settings → Developer → AI Prompts).
 */
export async function GET() {
  try {
    if (!(await requireDeveloper())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace' }, { status: 403 });
    }

    // Group AICallSnapshot by sourceIdentifier
    const snapshots = await prisma.aICallSnapshot.groupBy({
      by: ['sourceIdentifier', 'sourceType'],
      where: { workspaceId },
      _count: { contentHash: true },
      _max: { createdAt: true },
    });

    // For each sourceIdentifier, fetch related Trace stats via separate query.
    // (Prisma groupBy across joined tables is awkward — two-pass is simpler.)
    const identifiers = snapshots.map((s) => s.sourceIdentifier);

    const traceStats = await prisma.aICallTrace.findMany({
      where: {
        workspaceId,
        aiCallSnapshot: { sourceIdentifier: { in: identifiers } },
      },
      select: {
        aiCallSnapshot: { select: { sourceIdentifier: true } },
        responseMetadata: true,
        startedAt: true,
        completedAt: true,
      },
    });

    // Aggregate trace stats per sourceIdentifier
    type Stats = {
      callCount: number;
      successCount: number;
      errorCount: number;
      totalLatencyMs: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      lastCallAt: Date | null;
    };
    const statsBySource: Record<string, Stats> = {};

    for (const t of traceStats) {
      const id = t.aiCallSnapshot.sourceIdentifier;
      if (!statsBySource[id]) {
        statsBySource[id] = {
          callCount: 0,
          successCount: 0,
          errorCount: 0,
          totalLatencyMs: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          lastCallAt: null,
        };
      }
      const s = statsBySource[id];
      s.callCount++;
      const meta = (t.responseMetadata ?? {}) as {
        errorCode?: string;
        latencyMs?: number;
        inputTokens?: number;
        outputTokens?: number;
      };
      if (meta.errorCode) {
        s.errorCount++;
      } else if (t.completedAt) {
        s.successCount++;
      }
      s.totalLatencyMs += meta.latencyMs ?? 0;
      s.totalInputTokens += meta.inputTokens ?? 0;
      s.totalOutputTokens += meta.outputTokens ?? 0;
      if (!s.lastCallAt || t.startedAt > s.lastCallAt) {
        s.lastCallAt = t.startedAt;
      }
    }

    const prompts = snapshots.map((snap) => {
      const stats = statsBySource[snap.sourceIdentifier] ?? {
        callCount: 0,
        successCount: 0,
        errorCount: 0,
        totalLatencyMs: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        lastCallAt: null,
      };
      return {
        sourceIdentifier: snap.sourceIdentifier,
        sourceType: snap.sourceType,
        uniqueVersions: snap._count.contentHash,
        firstSeenAt: snap._max.createdAt?.toISOString() ?? null,
        lastCallAt: stats.lastCallAt?.toISOString() ?? null,
        callCount: stats.callCount,
        successCount: stats.successCount,
        errorCount: stats.errorCount,
        avgLatencyMs:
          stats.callCount > 0
            ? Math.round(stats.totalLatencyMs / stats.callCount)
            : 0,
        totalInputTokens: stats.totalInputTokens,
        totalOutputTokens: stats.totalOutputTokens,
      };
    });

    // Sort by call count descending — most-used first
    prompts.sort((a, b) => b.callCount - a.callCount);

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error('[GET /api/admin/prompt-registry]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
