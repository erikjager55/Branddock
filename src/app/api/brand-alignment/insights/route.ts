// ============================================================
// GET /api/brand-alignment/insights
//
// Pilot-feedback dashboard voor de Δ-1 trifecta (Surface C/D/E).
// Workspace-scoped 30d aggregate over:
//   - ContentReviewLog  → externe paste/url reviews (Surface C+D, gecombineerd)
//   - ContentFidelityScore → interne canvas-content reviews (Surface E)
//   - BrandReviewFinding   → severity + category hot-spot data (alle drie)
//
// Returnt KPI-totalen, threshold-pass-rate, override-rate, top finding-
// categories, 7d trend voor sparkline, en de laatste 5 reviews voor
// recent-list. Geen extra schema-velden nodig — alle data is al persistent.
// ============================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface CategoryCount {
  category: string;
  count: number;
}

interface PassRatePoint {
  /** Day-bucket label, ISO date (YYYY-MM-DD) */
  date: string;
  /** Pass-rate als percentage (0-100), 0 als geen reviews die dag */
  passRate: number;
  /** Aantal reviews op die dag — voor tooltip "8 reviews vandaag" */
  reviewCount: number;
}

interface RecentReview {
  id: string;
  source: 'paste' | 'url' | 'canvas';
  compositeScore: number;
  thresholdMet: boolean;
  findingsCount: number;
  scoredAt: string;
}

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const now = Date.now();
    const since30d = new Date(now - 30 * ONE_DAY_MS);
    const since7d = now - 7 * ONE_DAY_MS;

    // ── External reviews (Surface C+D) ──
    const externalReviews = await prisma.contentReviewLog.findMany({
      where: { workspaceId, createdAt: { gte: since30d } },
      select: {
        id: true,
        sourceType: true,
        compositeScore: true,
        createdAt: true,
        findings: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ── Internal reviews (Surface E) ──
    const internalScores = await prisma.contentFidelityScore.findMany({
      where: { workspaceId, scoredAt: { gte: since30d } },
      select: {
        id: true,
        compositeScore: true,
        thresholdMet: true,
        findingsCount: true,
        scoredAt: true,
      },
      orderBy: { scoredAt: 'desc' },
    });

    // ── Findings hot-spot (top categories over 30d, beide bronnen) ──
    // groupBy over BrandReviewFinding workspace-scoped voor 30d. XOR-shape
    // betekent dat dezelfde tabel alle findings van Surface C/D/E bevat.
    const categoryGroups = await prisma.brandReviewFinding.groupBy({
      by: ['category'],
      where: { workspaceId, createdAt: { gte: since30d } },
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
    });
    const topCategories: CategoryCount[] = categoryGroups
      .map((g) => ({ category: g.category as string, count: g._count._all }))
      .slice(0, 5);

    // ── KPI berekeningen ──
    // Threshold-met derivatie: external `ContentReviewLog` heeft geen
    // `thresholdMet` veld (zie Surface C task-Notes), dus berekenen via
    // DEFAULT_COMPOSITE_THRESHOLD = 75 (consistent met Surface C GET endpoint).
    const DEFAULT_THRESHOLD = 75;

    const externalPassed = externalReviews.filter(
      (r) => r.compositeScore >= DEFAULT_THRESHOLD,
    ).length;
    const internalPassed = internalScores.filter((s) => s.thresholdMet).length;
    const totalReviews = externalReviews.length + internalScores.length;
    const totalPassed = externalPassed + internalPassed;
    const thresholdPassRate =
      totalReviews > 0 ? Math.round((totalPassed / totalReviews) * 100) : 0;

    const totalFindings =
      externalReviews.reduce((sum, r) => sum + r.findings.length, 0) +
      internalScores.reduce((sum, s) => sum + (s.findingsCount ?? 0), 0);

    // ── Override-rate (Surface E PublishGate) ──
    // Below-threshold internal scores die "blocked" zijn — we tellen er
    // hoeveel actually published-via-override zijn. We hebben momenteel geen
    // direct schema-veld dat override op een score koppelt; we proxieren via
    // `Deliverable.publishedAt` set + score thresholdMet=false (een blocked
    // score op een gepubliceerde deliverable IS een override).
    const blockedInternal = internalScores.filter((s) => !s.thresholdMet);
    let overrides = 0;
    if (blockedInternal.length > 0) {
      // Pak unieke deliverables van de blocked scores via ContentVersion.
      const scoreIds = blockedInternal.map((s) => s.id);
      const versionsForBlocked = await prisma.contentFidelityScore.findMany({
        where: { id: { in: scoreIds } },
        select: { contentVersion: { select: { deliverable: { select: { publishedAt: true } } } } },
      });
      overrides = versionsForBlocked.filter(
        (v) => v.contentVersion.deliverable.publishedAt !== null,
      ).length;
    }
    const overrideRate =
      blockedInternal.length > 0
        ? Math.round((overrides / blockedInternal.length) * 100)
        : 0;

    // ── 7d threshold-pass-rate trend voor sparkline ──
    // Day-buckets per review-datum. Lege dagen krijgen passRate=0 +
    // reviewCount=0 zodat de sparkline een continue lijn over 7 punten geeft.
    const passRateTrend: PassRatePoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now - i * ONE_DAY_MS);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + ONE_DAY_MS);

      const externalDay = externalReviews.filter(
        (r) =>
          r.createdAt.getTime() >= dayStart.getTime() &&
          r.createdAt.getTime() < dayEnd.getTime(),
      );
      const internalDay = internalScores.filter(
        (s) =>
          s.scoredAt.getTime() >= dayStart.getTime() &&
          s.scoredAt.getTime() < dayEnd.getTime(),
      );

      const dayTotal = externalDay.length + internalDay.length;
      const dayPassed =
        externalDay.filter((r) => r.compositeScore >= DEFAULT_THRESHOLD).length +
        internalDay.filter((s) => s.thresholdMet).length;
      const dayPassRate = dayTotal > 0 ? Math.round((dayPassed / dayTotal) * 100) : 0;

      passRateTrend.push({
        date: dayStart.toISOString().slice(0, 10),
        passRate: dayPassRate,
        reviewCount: dayTotal,
      });
    }

    // ── Recent reviews lijst (laatste 5, gemixt extern + intern) ──
    type RecentRaw = {
      id: string;
      source: 'paste' | 'url' | 'canvas';
      compositeScore: number;
      thresholdMet: boolean;
      findingsCount: number;
      scoredAt: Date;
    };
    const recentRaw: RecentRaw[] = [
      ...externalReviews.map<RecentRaw>((r) => ({
        id: r.id,
        source: r.sourceType === 'url' ? 'url' : 'paste',
        compositeScore: r.compositeScore,
        thresholdMet: r.compositeScore >= DEFAULT_THRESHOLD,
        findingsCount: r.findings.length,
        scoredAt: r.createdAt,
      })),
      ...internalScores.map<RecentRaw>((s) => ({
        id: s.id,
        source: 'canvas' as const,
        compositeScore: s.compositeScore,
        thresholdMet: s.thresholdMet,
        findingsCount: s.findingsCount ?? 0,
        scoredAt: s.scoredAt,
      })),
    ];
    const recentReviews: RecentReview[] = recentRaw
      .sort((a, b) => b.scoredAt.getTime() - a.scoredAt.getTime())
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        source: r.source,
        compositeScore: Math.round(r.compositeScore),
        thresholdMet: r.thresholdMet,
        findingsCount: r.findingsCount,
        scoredAt: r.scoredAt.toISOString(),
      }));

    // ── 7d count voor "recent activity" subkop ──
    const reviewsLast7d =
      externalReviews.filter((r) => r.createdAt.getTime() >= since7d).length +
      internalScores.filter((s) => s.scoredAt.getTime() >= since7d).length;

    return NextResponse.json({
      window: '30d',
      generatedAt: new Date().toISOString(),
      totals: {
        totalReviews,
        externalReviews: externalReviews.length,
        internalReviews: internalScores.length,
        reviewsLast7d,
        totalFindings,
        thresholdPassRate,
        overrideRate,
        blockedCount: blockedInternal.length,
      },
      topCategories,
      passRateTrend,
      recentReviews,
    });
  } catch (error) {
    console.error('[GET /api/brand-alignment/insights]', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 },
    );
  }
}
