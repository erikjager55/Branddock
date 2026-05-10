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
import { DEFAULT_COMPOSITE_THRESHOLD } from '@/lib/brand-fidelity/composition-engine';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_FETCH_CAP = 5000;

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
    // take: 5000 als runaway-guard; bij overschrijding signaleren we via
    // de `truncated` response-flag (UI toont waarschuwing). `_count.findings`
    // ipv relation-load voorkomt memory-spike bij outlier-reviews met
    // duizenden findings — we hebben alleen het aantal nodig, niet de IDs.
    const externalReviews = await prisma.contentReviewLog.findMany({
      where: { workspaceId, createdAt: { gte: since30d } },
      select: {
        id: true,
        sourceType: true,
        compositeScore: true,
        createdAt: true,
        _count: { select: { findings: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: REVIEW_FETCH_CAP,
    });

    // ── Internal reviews (Surface E) ──
    // contentVersion.deliverable.publishedAt meeladen zodat we override-rate
    // in één Prisma-call kunnen berekenen (geen N+1).
    const internalScores = await prisma.contentFidelityScore.findMany({
      where: { workspaceId, scoredAt: { gte: since30d } },
      select: {
        id: true,
        compositeScore: true,
        thresholdMet: true,
        findingsCount: true,
        scoredAt: true,
        contentVersion: {
          select: {
            deliverable: { select: { publishedAt: true } },
          },
        },
      },
      orderBy: { scoredAt: 'desc' },
      take: REVIEW_FETCH_CAP,
    });

    // ── Findings hot-spot (top categories over 30d, beide bronnen) ──
    // groupBy over BrandReviewFinding workspace-scoped voor 30d. XOR-shape
    // betekent dat dezelfde tabel alle findings van Surface C/D/E bevat.
    //
    // NB bij truncation: deze query telt ALLE findings in 30d (geen review-
    // cap), terwijl `totalFindings` uit de capped reviews-arrays komt.
    // Dat kan visuele inconsistency geven (category-sum > totalFindings)
    // wanneer >5000 reviews bestaan. Bewuste keuze: top-categorieën zijn
    // stabieler bij volledige scan dan bij review-subset; bij truncation
    // toont de banner de undercount-disclaimer en is dit acceptable.
    // Tie-break-orderBy [count desc, category asc] geeft een stabiele
    // ordering tussen requests — anders kunnen categorieën met gelijke
    // counts willekeurig swappen op de dashboard.
    const categoryGroups = await prisma.brandReviewFinding.groupBy({
      by: ['category'],
      where: { workspaceId, createdAt: { gte: since30d } },
      _count: { id: true },
      orderBy: [
        { _count: { id: 'desc' } },
        { category: 'asc' },
      ],
      take: 5,
    });
    const topCategories: CategoryCount[] = categoryGroups.map((g) => ({
      category: g.category,
      count: g._count.id,
    }));

    // ── KPI berekeningen ──
    // Threshold-met-mix: extern (ContentReviewLog) heeft geen `thresholdMet`
    // veld — we deriveren via DEFAULT_COMPOSITE_THRESHOLD (75). Intern
    // (ContentFidelityScore) heeft wél persistent `thresholdMet` per-version,
    // mogelijk berekend met een andere per-content-type drempel uit
    // fidelity-criteria.ts (varieert 60-75 per type). De overall
    // `thresholdPassRate` mengt dus twee threshold-systemen — voor pilot-
    // signaal acceptabel (overall trend > exacte vergelijkbaarheid), bij
    // dieper onderzoek kunnen extern/intern aparte rates getoond worden.

    const externalPassed = externalReviews.filter(
      (r) => r.compositeScore >= DEFAULT_COMPOSITE_THRESHOLD,
    ).length;
    const internalPassed = internalScores.filter((s) => s.thresholdMet).length;
    const totalReviews = externalReviews.length + internalScores.length;
    const totalPassed = externalPassed + internalPassed;
    const thresholdPassRate =
      totalReviews > 0 ? Math.round((totalPassed / totalReviews) * 100) : 0;

    const totalFindings =
      externalReviews.reduce((sum, r) => sum + r._count.findings, 0) +
      internalScores.reduce((sum, s) => sum + (s.findingsCount ?? 0), 0);

    // ── "Blocked & published" rate (Surface E PublishGate proxy) ──
    // Telt below-threshold internal scores wier deliverable later (op een
    // versie die niet per se deze score is) gepubliceerd werd. PROXY: we
    // hebben geen schema-link tussen de blocked-versie en de published-
    // versie, dus dit is een approximatie die overtelt wanneer een latere
    // (passing) versie van dezelfde deliverable gepubliceerd werd. Voor
    // pilot-signal goed genoeg; KPI-label expliciet "Below-threshold
    // gepubliceerd" om de proxy-aard te communiceren.
    const blockedInternal = internalScores.filter((s) => !s.thresholdMet);
    const blockedAndPublished = blockedInternal.filter(
      (s) => s.contentVersion.deliverable.publishedAt !== null,
    ).length;
    const blockedPublishedRate =
      blockedInternal.length > 0
        ? Math.round((blockedAndPublished / blockedInternal.length) * 100)
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
        externalDay.filter((r) => r.compositeScore >= DEFAULT_COMPOSITE_THRESHOLD).length +
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
        thresholdMet: r.compositeScore >= DEFAULT_COMPOSITE_THRESHOLD,
        findingsCount: r._count.findings,
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

    // Truncated-flag — wanneer een van de twee fetches de runaway-cap
    // raakt, zijn KPIs uit een gedeeltelijke set berekend. UI rendert dan
    // een waarschuwing zodat de pilot-verdict niet stiekem op onderschatte
    // counts wordt gebaseerd. Pas-gelijk-aan-cap is hier voldoende-signaal:
    // bij precies REVIEW_FETCH_CAP records is er groot risico dat er meer
    // bestaan zonder dat we het zien.
    const truncated =
      externalReviews.length >= REVIEW_FETCH_CAP ||
      internalScores.length >= REVIEW_FETCH_CAP;

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
        blockedPublishedRate,
        blockedCount: blockedInternal.length,
      },
      topCategories,
      passRateTrend,
      recentReviews,
      truncated,
    });
  } catch (error) {
    console.error('[GET /api/brand-alignment/insights]', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 },
    );
  }
}
