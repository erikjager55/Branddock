import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { requireDeveloper } from '@/lib/developer-access';

/**
 * GET /api/admin/prompt-registry/[identifier]
 *
 * Detail view per prompt-template (sourceIdentifier). Returns:
 * - All unique AICallSnapshot versions (grouped by contentHash)
 * - Per version: payload preview, call count, first/last seen, gitSha
 * - Aggregated trace stats (tokens, latency, errors)
 *
 * The `identifier` URL-segment is decoded — sourceIdentifiers contain ":"
 * and "/" chars which must be URL-encoded by the client.
 *
 * Developer-only.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    if (!(await requireDeveloper())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace' }, { status: 403 });
    }

    const { identifier: rawIdentifier } = await params;
    const sourceIdentifier = decodeURIComponent(rawIdentifier);

    // All unique versions (one per contentHash)
    const versions = await prisma.aICallSnapshot.findMany({
      where: { workspaceId, sourceIdentifier },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        contentHash: true,
        payload: true,
        sourceType: true,
        gitSha: true,
        promptVersion: true,
        createdAt: true,
        _count: { select: { callTraces: true } },
      },
    });

    if (versions.length === 0) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    // Aggregate trace stats across all versions
    const traces = await prisma.aICallTrace.findMany({
      where: {
        workspaceId,
        aiCallSnapshot: { sourceIdentifier },
      },
      select: {
        responseMetadata: true,
        propertyEvalResults: true,
        startedAt: true,
        completedAt: true,
        aiCallSnapshotId: true,
      },
    });

    // Per-version stats
    type VersionStats = {
      callCount: number;
      successCount: number;
      errorCount: number;
      totalLatencyMs: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      lastCallAt: Date | null;
      // Property-eval Layer 1 aggregates (content-test #5.A)
      propertyEvalRunCount: number;
      propertyEvalPassedCount: number;
      propertyEvalTotalBlock: number;
      propertyEvalTotalWarn: number;
    };
    const statsByVersion: Record<string, VersionStats> = {};
    for (const t of traces) {
      const id = t.aiCallSnapshotId;
      if (!statsByVersion[id]) {
        statsByVersion[id] = {
          callCount: 0,
          successCount: 0,
          errorCount: 0,
          totalLatencyMs: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          lastCallAt: null,
          propertyEvalRunCount: 0,
          propertyEvalPassedCount: 0,
          propertyEvalTotalBlock: 0,
          propertyEvalTotalWarn: 0,
        };
      }
      const s = statsByVersion[id];
      s.callCount++;
      const meta = (t.responseMetadata ?? {}) as {
        errorCode?: string;
        latencyMs?: number;
        inputTokens?: number;
        outputTokens?: number;
      };
      if (meta.errorCode) s.errorCount++;
      else if (t.completedAt) s.successCount++;
      s.totalLatencyMs += meta.latencyMs ?? 0;
      s.totalInputTokens += meta.inputTokens ?? 0;
      s.totalOutputTokens += meta.outputTokens ?? 0;
      if (!s.lastCallAt || t.startedAt > s.lastCallAt) s.lastCallAt = t.startedAt;

      // Property-eval aggregates (skip null voor backwards-compat pre-#5.A)
      const evalResults = t.propertyEvalResults as
        | { passed?: boolean; blockViolations?: unknown[]; warnings?: unknown[] }
        | null;
      if (evalResults) {
        s.propertyEvalRunCount++;
        if (evalResults.passed) s.propertyEvalPassedCount++;
        s.propertyEvalTotalBlock += evalResults.blockViolations?.length ?? 0;
        s.propertyEvalTotalWarn += evalResults.warnings?.length ?? 0;
      }
    }

    const versionsWithStats = versions.map((v) => {
      const stats = statsByVersion[v.id] ?? {
        callCount: 0,
        successCount: 0,
        errorCount: 0,
        totalLatencyMs: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        lastCallAt: null,
        propertyEvalRunCount: 0,
        propertyEvalPassedCount: 0,
        propertyEvalTotalBlock: 0,
        propertyEvalTotalWarn: 0,
      };
      // Extract a payload-preview that is safe to ship (truncated message text)
      const p = v.payload as {
        model?: string;
        messages?: Array<{ role?: string; content?: string | unknown[] }>;
        params?: unknown;
        providerExtensions?: unknown;
      };
      const messagePreview =
        p.messages?.map((m) => ({
          role: m.role ?? 'unknown',
          content:
            typeof m.content === 'string'
              ? m.content.slice(0, 2000)
              : '[multipart content]',
        })) ?? [];

      return {
        snapshotId: v.id,
        contentHash: v.contentHash,
        sourceType: v.sourceType,
        gitSha: v.gitSha,
        promptVersion: v.promptVersion,
        firstSeenAt: v.createdAt.toISOString(),
        model: p.model ?? null,
        messages: messagePreview,
        params: p.params ?? null,
        providerExtensions: p.providerExtensions ?? null,
        callCount: stats.callCount,
        successCount: stats.successCount,
        errorCount: stats.errorCount,
        avgLatencyMs:
          stats.callCount > 0
            ? Math.round(stats.totalLatencyMs / stats.callCount)
            : 0,
        totalInputTokens: stats.totalInputTokens,
        totalOutputTokens: stats.totalOutputTokens,
        lastCallAt: stats.lastCallAt?.toISOString() ?? null,
        // Property-eval Layer 1 aggregaten (content-test #5.A)
        propertyEvalRunCount: stats.propertyEvalRunCount,
        propertyEvalPassRate:
          stats.propertyEvalRunCount > 0
            ? Math.round((stats.propertyEvalPassedCount / stats.propertyEvalRunCount) * 100)
            : null,
        propertyEvalTotalBlock: stats.propertyEvalTotalBlock,
        propertyEvalTotalWarn: stats.propertyEvalTotalWarn,
      };
    });

    return NextResponse.json({
      sourceIdentifier,
      versionCount: versions.length,
      versions: versionsWithStats,
    });
  } catch (error) {
    console.error('[GET /api/admin/prompt-registry/:identifier]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
