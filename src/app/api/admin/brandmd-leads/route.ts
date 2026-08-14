// =============================================================
// GET /api/admin/brandmd-leads — leads-dashboard (task onderdeel 8)
//
// Auth: uitsluitend DEVELOPER_EMAILS (requireDeveloper) — platform-
// breed inzicht, zelfde gating als Credit Admin (#373).
//
// DB-gedreven (bewust niet PostHog): statusladder per lead uit
// GeneratedBrandProfile-timestamps + workspace/billing-join, zodat
// het dashboard klopt óók als analytics uitvalt. Lead = genormaliseerd
// domein, geaggregeerd over runs.
// =============================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDeveloper } from '@/lib/developer-access';

export const dynamic = 'force-dynamic';

export type LeadStage =
  | 'SCANNED'
  | 'DOWNLOADED'
  | 'REPORT'
  | 'CLAIMED'
  | 'ACTIVATED'
  | 'TRIAL'
  | 'PAID'
  | 'EXPIRED';

interface LeadRow {
  domain: string;
  brandName: string;
  stage: LeadStage;
  runs: number;
  bestScore: number | null;
  email: string | null;
  lastActivity: string;
  claimedWorkspaceId: string | null;
  planTier: string | null;
  /** ≥2 domeinen door zelfde e-mail/claimer/IP-hash → bureau-patroon (touchpoint 5.3) */
  agencySignal: boolean;
}

const PAID_TIERS = new Set(['STARTER', 'GROWTH', 'AGENCY', 'PRO', 'ENTERPRISE']);

export async function GET() {
  const session = await requireDeveloper();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const profiles = await prisma.generatedBrandProfile.findMany({
      orderBy: { createdAt: 'desc' },
      take: 2000,
      select: {
        domain: true,
        brandName: true,
        status: true,
        score: true,
        email: true,
        requestIpHash: true,
        createdAt: true,
        downloadedAt: true,
        emailCapturedAt: true,
        claimedAt: true,
        activatedAt: true,
        claimedByUserId: true,
        claimedWorkspaceId: true,
      },
    });

    // Workspace-tier voor Trial/Paid-onderscheid (claimed leads).
    const workspaceIds = [
      ...new Set(profiles.map((p) => p.claimedWorkspaceId).filter((id): id is string => !!id)),
    ];
    const workspaces = workspaceIds.length
      ? await prisma.workspace.findMany({
          where: { id: { in: workspaceIds } },
          select: { id: true, planTier: true },
        })
      : [];
    const tierByWorkspace = new Map(workspaces.map((w) => [w.id, String(w.planTier)]));

    // Activatie-event (touchpoints v2 §3): eerste F-VAL-gescoorde generatie in
    // de geclaimde workspace. Lazy write-once: geclaimde profielen zonder
    // activatedAt krijgen 'm zodra hun workspace een ContentFidelityScore heeft.
    const pendingActivation = profiles.filter((p) => p.claimedWorkspaceId && p.claimedAt && !p.activatedAt);
    if (pendingActivation.length > 0) {
      const pendingIds = [...new Set(pendingActivation.map((p) => p.claimedWorkspaceId as string))];
      const scored = await prisma.contentFidelityScore.groupBy({
        by: ['workspaceId'],
        where: { workspaceId: { in: pendingIds } },
        _min: { scoredAt: true },
      });
      const firstScoreByWs = new Map(scored.map((s) => [s.workspaceId, s._min.scoredAt]));
      for (const p of pendingActivation) {
        const firstScore = firstScoreByWs.get(p.claimedWorkspaceId as string);
        if (firstScore) {
          p.activatedAt = firstScore;
          await prisma.generatedBrandProfile.updateMany({
            where: { claimedWorkspaceId: p.claimedWorkspaceId, activatedAt: null },
            data: { activatedAt: firstScore },
          });
        }
      }
    }

    // Agency-signaal: ≥2 verschillende domeinen vanaf zelfde e-mail, claimer of IP-hash.
    const domainsByActor = new Map<string, Set<string>>();
    for (const p of profiles) {
      for (const actor of [p.email, p.claimedByUserId, p.requestIpHash]) {
        if (!actor) continue;
        const set = domainsByActor.get(actor) ?? new Set<string>();
        set.add(p.domain);
        domainsByActor.set(actor, set);
      }
    }
    const isAgencyActor = (p: (typeof profiles)[number]): boolean =>
      [p.email, p.claimedByUserId, p.requestIpHash].some(
        (actor) => actor && (domainsByActor.get(actor)?.size ?? 0) >= 2,
      );

    // Aggregatie per domein → hoogste ladder-stand wint.
    const leadsByDomain = new Map<string, LeadRow>();
    for (const p of profiles) {
      const tier = p.claimedWorkspaceId ? (tierByWorkspace.get(p.claimedWorkspaceId) ?? null) : null;
      const stage = stageOf(p, tier);
      const existing = leadsByDomain.get(p.domain);
      const activity = latestTimestamp(p);
      if (!existing) {
        leadsByDomain.set(p.domain, {
          domain: p.domain,
          brandName: p.brandName,
          stage,
          runs: 1,
          bestScore: p.score,
          email: p.email,
          lastActivity: activity,
          claimedWorkspaceId: p.claimedWorkspaceId,
          planTier: tier,
          agencySignal: isAgencyActor(p),
        });
      } else {
        existing.runs += 1;
        if (stageRank(stage) > stageRank(existing.stage)) {
          existing.stage = stage;
          existing.claimedWorkspaceId = p.claimedWorkspaceId ?? existing.claimedWorkspaceId;
          existing.planTier = tier ?? existing.planTier;
        }
        if ((p.score ?? -1) > (existing.bestScore ?? -1)) existing.bestScore = p.score;
        if (!existing.email && p.email) existing.email = p.email;
        if (activity > existing.lastActivity) existing.lastActivity = activity;
        existing.agencySignal = existing.agencySignal || isAgencyActor(p);
      }
    }
    const leads = [...leadsByDomain.values()].sort((a, b) =>
      b.lastActivity.localeCompare(a.lastActivity),
    );

    // Funnel-telling over leads (niet runs): elke stap telt leads die die
    // stap of verder haalden — conversie-% naast de touchpoints-v2-targets.
    const reached = (stage: LeadStage) =>
      leads.filter((l) => stageRank(l.stage) >= stageRank(stage) && l.stage !== 'EXPIRED').length;
    const funnel = [
      { stage: 'SCANNED' as const, count: leads.filter((l) => l.stage !== 'EXPIRED').length, target: null },
      { stage: 'DOWNLOADED' as const, count: reached('DOWNLOADED'), target: 60 },
      { stage: 'REPORT' as const, count: reached('REPORT'), target: 25 },
      { stage: 'CLAIMED' as const, count: reached('CLAIMED'), target: 10 },
      { stage: 'ACTIVATED' as const, count: reached('ACTIVATED'), target: 40 },
      { stage: 'PAID' as const, count: leads.filter((l) => l.stage === 'PAID').length, target: 15 },
    ].map((step, i, arr) => ({
      ...step,
      pctOfPrev: i === 0 || arr[i - 1].count === 0 ? null : Math.round((step.count / arr[i - 1].count) * 100),
    }));

    return NextResponse.json({
      funnel,
      leads,
      totals: {
        runs: profiles.length,
        leads: leads.length,
        expired: leads.filter((l) => l.stage === 'EXPIRED').length,
        agencySignals: leads.filter((l) => l.agencySignal).length,
      },
    });
  } catch (error) {
    console.error('[GET /api/admin/brandmd-leads]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function stageOf(
  p: {
    status: string;
    downloadedAt: Date | null;
    emailCapturedAt: Date | null;
    claimedAt: Date | null;
    activatedAt: Date | null;
  },
  planTier: string | null,
): LeadStage {
  if (p.status === 'EXPIRED') return 'EXPIRED';
  if (p.claimedAt) {
    if (planTier && PAID_TIERS.has(planTier)) return 'PAID';
    if (p.activatedAt) return 'ACTIVATED';
    return 'CLAIMED';
  }
  if (p.emailCapturedAt) return 'REPORT';
  if (p.downloadedAt) return 'DOWNLOADED';
  return 'SCANNED';
}

function stageRank(stage: LeadStage): number {
  switch (stage) {
    case 'EXPIRED': return -1;
    case 'SCANNED': return 0;
    case 'DOWNLOADED': return 1;
    case 'REPORT': return 2;
    case 'CLAIMED': return 3;
    case 'ACTIVATED': return 4;
    case 'TRIAL': return 5;
    case 'PAID': return 6;
  }
}

function latestTimestamp(p: {
  createdAt: Date;
  downloadedAt: Date | null;
  emailCapturedAt: Date | null;
  claimedAt: Date | null;
  activatedAt: Date | null;
}): string {
  const dates = [p.createdAt, p.downloadedAt, p.emailCapturedAt, p.claimedAt, p.activatedAt].filter(
    (d): d is Date => !!d,
  );
  return new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString();
}
