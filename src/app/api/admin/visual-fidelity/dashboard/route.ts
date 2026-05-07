import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { requireDeveloper } from '@/lib/developer-access';

/**
 * GET /api/admin/visual-fidelity/dashboard
 *
 * G8 workspace aggregate dashboard. Surfaces brand-coherence trends across
 * all generated images in the workspace.
 *
 * Returns:
 *   - totals (24h / 7d / 30d / all-time count)
 *   - average composite + threshold-met rate per window
 *   - distribution buckets (good ≥70 / warn 50–69 / bad <50)
 *   - flagged-dimension counts (which AI judge dimensions trip most often)
 *   - top-10 lowest-scoring components (with imageUrl + composite for review)
 *
 * Developer-only — same gate as the prompt-registry dashboard.
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface DimensionStats {
  flaggedCount: number;
  averageScore: number;
  totalScore: number;
  count: number;
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

    const scores = await prisma.contentVisualFidelityScore.findMany({
      where: { workspaceId, scoredAt: { gte: since30d } },
      select: {
        id: true,
        scoredAt: true,
        compositeScore: true,
        thresholdMet: true,
        imageUrl: true,
        componentId: true,
        colorAlignment: true,
        aiJudgeDimensions: true,
      },
      orderBy: { scoredAt: 'desc' },
      take: 5000,
    });

    const allTimeCount = await prisma.contentVisualFidelityScore.count({
      where: { workspaceId },
    });

    const since7d = now - 7 * ONE_DAY_MS;
    const since24h = now - ONE_DAY_MS;

    let count24h = 0;
    let count7d = 0;
    const count30d = scores.length;

    let sum24h = 0;
    let sum7d = 0;
    let sum30d = 0;

    let metCount30d = 0;
    let metCount7d = 0;
    let metCount24h = 0;

    let goodCount = 0;
    let warnCount = 0;
    let badCount = 0;

    let avgColorScoreSum = 0;
    let avgColorScoreCount = 0;

    const dimensionStats = new Map<string, DimensionStats>();

    type LowScoreEntry = {
      id: string;
      componentId: string;
      imageUrl: string;
      compositeScore: number;
      scoredAt: string;
    };
    const lowScores: LowScoreEntry[] = [];

    for (const s of scores) {
      const ts = s.scoredAt.getTime();
      const composite = s.compositeScore;

      sum30d += composite;
      if (s.thresholdMet) metCount30d++;

      if (ts >= since7d) {
        count7d++;
        sum7d += composite;
        if (s.thresholdMet) metCount7d++;
      }
      if (ts >= since24h) {
        count24h++;
        sum24h += composite;
        if (s.thresholdMet) metCount24h++;
      }

      if (composite >= 70) goodCount++;
      else if (composite >= 50) warnCount++;
      else badCount++;

      // Color alignment sub-score
      const ca = s.colorAlignment as { score?: unknown } | null;
      if (ca && typeof ca.score === 'number') {
        avgColorScoreSum += ca.score;
        avgColorScoreCount++;
      }

      // AI judge dimensions
      const judge = s.aiJudgeDimensions as
        | { skipped?: boolean; flagged?: string[]; dimensions?: Record<string, { score: number }> }
        | null;
      if (judge && !judge.skipped && judge.dimensions) {
        const flaggedSet = new Set(judge.flagged ?? []);
        for (const [key, val] of Object.entries(judge.dimensions)) {
          if (typeof val?.score !== 'number') continue;
          let entry = dimensionStats.get(key);
          if (!entry) {
            entry = { flaggedCount: 0, averageScore: 0, totalScore: 0, count: 0 };
            dimensionStats.set(key, entry);
          }
          entry.totalScore += val.score;
          entry.count++;
          if (flaggedSet.has(key)) entry.flaggedCount++;
        }
      }

      lowScores.push({
        id: s.id,
        componentId: s.componentId,
        imageUrl: s.imageUrl,
        compositeScore: composite,
        scoredAt: s.scoredAt.toISOString(),
      });
    }

    const round = (n: number) => Math.round(n * 10) / 10;

    const avg24h = count24h > 0 ? round(sum24h / count24h) : 0;
    const avg7d = count7d > 0 ? round(sum7d / count7d) : 0;
    const avg30d = count30d > 0 ? round(sum30d / count30d) : 0;

    const metRate24h = count24h > 0 ? round((metCount24h / count24h) * 100) : 0;
    const metRate7d = count7d > 0 ? round((metCount7d / count7d) * 100) : 0;
    const metRate30d = count30d > 0 ? round((metCount30d / count30d) * 100) : 0;

    const dimensions = [...dimensionStats.entries()]
      .map(([key, s]) => ({
        key,
        averageScore: s.count > 0 ? round(s.totalScore / s.count) : 0,
        flaggedCount: s.flaggedCount,
        flaggedRate: s.count > 0 ? round((s.flaggedCount / s.count) * 100) : 0,
        sampleSize: s.count,
      }))
      .sort((a, b) => b.flaggedRate - a.flaggedRate);

    const topLow = lowScores
      .sort((a, b) => a.compositeScore - b.compositeScore)
      .slice(0, 10);

    return NextResponse.json({
      window: '30d',
      generatedAt: new Date().toISOString(),
      totals: {
        count24h,
        count7d,
        count30d,
        countAllTime: allTimeCount,
        avg24h,
        avg7d,
        avg30d,
        metRate24h,
        metRate7d,
        metRate30d,
      },
      distribution: {
        good: goodCount,
        warn: warnCount,
        bad: badCount,
      },
      averageColorAlignment:
        avgColorScoreCount > 0 ? round(avgColorScoreSum / avgColorScoreCount) : 0,
      dimensions,
      topLowScores: topLow,
    });
  } catch (error) {
    console.error('[GET /api/admin/visual-fidelity/dashboard]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
