import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { requireDeveloper } from '@/lib/developer-access';
import { estimateCostUsd, lookupModelPricing } from '@/lib/learning-loop/model-pricing';

/**
 * GET /api/admin/prompt-registry/dashboard
 *
 * Aggregate stats across the whole workspace's AICallTrace history. Used by
 * the dashboard view at the top of Settings → Developer → AI Prompts.
 *
 * Returns:
 *   - calls totals (24h / 7d / 30d / all-time)
 *   - cost estimate (24h / 7d / 30d / all-time, USD)
 *   - failure rate per provider
 *   - average latency per provider
 *   - top-10 sourceIdentifiers by call count
 *   - top-10 sourceIdentifiers by failure count (≥1 failure)
 *   - distribution per provider/model
 *
 * Developer-only.
 */

interface ProviderBucket {
  provider: string;
  callCount: number;
  successCount: number;
  errorCount: number;
  totalLatencyMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  costUsd: number;
}

interface ModelBucket {
  model: string;
  provider: string;
  callCount: number;
  costUsd: number;
}

interface SourceStat {
  sourceIdentifier: string;
  callCount: number;
  errorCount: number;
  costUsd: number;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function emptyBucket(provider: string): ProviderBucket {
  return {
    provider,
    callCount: 0,
    successCount: 0,
    errorCount: 0,
    totalLatencyMs: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    costUsd: 0,
  };
}

export async function GET() {
  try {
    if (!(await requireDeveloper())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace' }, { status: 403 });
    }

    const now = Date.now();
    const since30d = new Date(now - 30 * ONE_DAY_MS);

    // Pull traces from the last 30 days (cap on the dataset size — older
    // calls are aggregated in the all-time totals via a separate query).
    const traces = await prisma.aICallTrace.findMany({
      where: { workspaceId, startedAt: { gte: since30d } },
      select: {
        startedAt: true,
        completedAt: true,
        responseMetadata: true,
        aiCallSnapshot: { select: { sourceIdentifier: true, payload: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 5000,
    });

    const allTimeCount = await prisma.aICallTrace.count({ where: { workspaceId } });

    // Helper to extract model from payload Json (defensive — payload shape
    // is application-controlled but may evolve).
    function extractModel(payload: unknown): string {
      if (typeof payload !== 'object' || payload === null) return 'unknown';
      const p = payload as { model?: unknown };
      return typeof p.model === 'string' ? p.model : 'unknown';
    }

    // Aggregate
    let calls24h = 0;
    let calls7d = 0;
    const calls30d = traces.length;
    let cost24h = 0;
    let cost7d = 0;
    let cost30d = 0;

    const byProvider = new Map<string, ProviderBucket>();
    const byModel = new Map<string, ModelBucket>();
    const bySource = new Map<string, SourceStat>();

    const since7d = now - 7 * ONE_DAY_MS;
    const since24h = now - ONE_DAY_MS;

    for (const t of traces) {
      const meta = (t.responseMetadata ?? {}) as {
        errorCode?: string;
        latencyMs?: number;
        inputTokens?: number;
        outputTokens?: number;
      };
      const inputTokens = meta.inputTokens ?? 0;
      const outputTokens = meta.outputTokens ?? 0;
      const model = extractModel(t.aiCallSnapshot.payload);
      const pricing = lookupModelPricing(model);
      const provider = pricing?.provider ?? 'unknown';
      const cost = estimateCostUsd(model, inputTokens, outputTokens);

      const startedMs = t.startedAt.getTime();
      if (startedMs >= since24h) {
        calls24h++;
        cost24h += cost;
      }
      if (startedMs >= since7d) {
        calls7d++;
        cost7d += cost;
      }
      cost30d += cost;

      // Provider bucket
      let pb = byProvider.get(provider);
      if (!pb) {
        pb = emptyBucket(provider);
        byProvider.set(provider, pb);
      }
      pb.callCount++;
      if (meta.errorCode) pb.errorCount++;
      else if (t.completedAt) pb.successCount++;
      pb.totalLatencyMs += meta.latencyMs ?? 0;
      pb.totalInputTokens += inputTokens;
      pb.totalOutputTokens += outputTokens;
      pb.costUsd += cost;

      // Model bucket
      const modelKey = `${provider}::${model}`;
      let mb = byModel.get(modelKey);
      if (!mb) {
        mb = { model, provider, callCount: 0, costUsd: 0 };
        byModel.set(modelKey, mb);
      }
      mb.callCount++;
      mb.costUsd += cost;

      // Source bucket
      const src = t.aiCallSnapshot.sourceIdentifier;
      let sb = bySource.get(src);
      if (!sb) {
        sb = { sourceIdentifier: src, callCount: 0, errorCount: 0, costUsd: 0 };
        bySource.set(src, sb);
      }
      sb.callCount++;
      if (meta.errorCode) sb.errorCount++;
      sb.costUsd += cost;
    }

    // Round costs for display (4 decimals)
    const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

    const providers = [...byProvider.values()]
      .map((b) => ({
        ...b,
        costUsd: round4(b.costUsd),
        avgLatencyMs: b.callCount > 0 ? Math.round(b.totalLatencyMs / b.callCount) : 0,
        failureRate: b.callCount > 0 ? Math.round((b.errorCount / b.callCount) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.callCount - a.callCount);

    const models = [...byModel.values()]
      .map((m) => ({ ...m, costUsd: round4(m.costUsd) }))
      .sort((a, b) => b.callCount - a.callCount)
      .slice(0, 20);

    const topByCalls = [...bySource.values()]
      .map((s) => ({ ...s, costUsd: round4(s.costUsd) }))
      .sort((a, b) => b.callCount - a.callCount)
      .slice(0, 10);

    const topByErrors = [...bySource.values()]
      .filter((s) => s.errorCount > 0)
      .map((s) => ({ ...s, costUsd: round4(s.costUsd) }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 10);

    return NextResponse.json({
      window: '30d',
      generatedAt: new Date().toISOString(),
      totals: {
        calls24h,
        calls7d,
        calls30d,
        callsAllTime: allTimeCount,
        cost24h: round4(cost24h),
        cost7d: round4(cost7d),
        cost30d: round4(cost30d),
      },
      providers,
      models,
      topByCalls,
      topByErrors,
    });
  } catch (error) {
    console.error('[GET /api/admin/prompt-registry/dashboard]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
