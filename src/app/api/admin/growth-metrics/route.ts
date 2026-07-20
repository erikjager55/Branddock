// Fase 0 van het €100k-plan (docs/reports/100k-plan-fasering-2026-07-20.md):
// het meetfundament. Developer-gated KPI-endpoint voor de funnel
// (aanmelding → activatie → betaald), de noordster (netto nieuwe MRR/dag,
// uit Stripe) en de Gate-1-latten. Definities:
// - aanmelding  = User.createdAt
// - activatie   = workspace met ≥3 volledig ingevulde merk-assets (zelfde
//   veld-compleetheids-helper als het readiness-dashboard) én een eerste
//   goedgekeurde uiting; activatiedatum = eerste accept (AgentArtifact.
//   acceptedAt) of eerste publicatie (Deliverable.publishedAt). V1-benadering:
//   asset-invuldata zijn niet historisch, dus "DNA compleet" wordt op nu
//   gemeten (gedocumenteerd in het faseringsdocument).
// - betaald     = Subscription met stripeSubscriptionId (echte Stripe-koppeling)
// - bureau      = Organization.type AGENCY
// Metadata-only: uitsluitend tellingen, geen inhoud.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDeveloper } from '@/lib/developer-access';
import { getAssetCompletenessPercentage } from '@/lib/brand-asset-completeness';
import { getStripeClient } from '@/lib/stripe/client';

export const dynamic = 'force-dynamic';

const WEEKS = 8;
const GATE_1 = { label: 'Gate 1 (eind okt 2026)', mrrEur: 3000, customers: 10, agencies: 5, activationPct: 35 };

function weekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d;
}

export async function GET(_req: NextRequest) {
  const session = await requireDeveloper();
  if (!session) {
    return NextResponse.json({ error: 'Developer access required' }, { status: 403 });
  }

  const now = new Date();
  const currentWeek = weekStart(now);
  const windowStart = new Date(currentWeek.getTime() - (WEEKS - 1) * 7 * 24 * 3600 * 1000);

  const [users, workspaces, assets, firstAccepts, firstPublishes, paidSubs] = await Promise.all([
    prisma.user.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { createdAt: true },
    }),
    prisma.workspace.findMany({
      select: { id: true, createdAt: true, organizationId: true, organization: { select: { type: true } } },
    }),
    prisma.brandAsset.findMany({
      select: { workspaceId: true, frameworkType: true, frameworkData: true, description: true },
    }),
    prisma.agentArtifact.groupBy({
      by: ['workspaceId'],
      where: { acceptedAt: { not: null } },
      _min: { acceptedAt: true },
    }),
    prisma.deliverable.groupBy({
      by: ['campaignId'],
      where: { publishedAt: { not: null } },
      _min: { publishedAt: true },
    }),
    prisma.subscription.findMany({
      where: { stripeSubscriptionId: { not: null } },
      select: {
        status: true,
        createdAt: true,
        workspace: { select: { organizationId: true, organization: { select: { type: true } } } },
      },
    }),
  ]);

  // Publicaties hangen via campagne aan een workspace — map campaignId → workspaceId.
  const campaignIds = firstPublishes.map((p) => p.campaignId);
  const campaigns = campaignIds.length
    ? await prisma.campaign.findMany({
        where: { id: { in: campaignIds } },
        select: { id: true, workspaceId: true },
      })
    : [];
  const campaignWs = new Map(campaigns.map((c) => [c.id, c.workspaceId]));

  // Merk-DNA-compleetheid per workspace: aantal assets met 100% ingevulde velden.
  const completeCount = new Map<string, number>();
  for (const asset of assets) {
    const pct = getAssetCompletenessPercentage(asset);
    if (pct === 100) {
      completeCount.set(asset.workspaceId, (completeCount.get(asset.workspaceId) ?? 0) + 1);
    }
  }

  // Eerste goedgekeurde uiting per workspace (accept of publicatie, vroegste).
  const firstApproved = new Map<string, Date>();
  for (const row of firstAccepts) {
    if (row._min.acceptedAt) firstApproved.set(row.workspaceId, row._min.acceptedAt);
  }
  for (const row of firstPublishes) {
    const wsId = campaignWs.get(row.campaignId);
    const at = row._min.publishedAt;
    if (!wsId || !at) continue;
    const existing = firstApproved.get(wsId);
    if (!existing || at < existing) firstApproved.set(wsId, at);
  }

  // Activatie: DNA ≥3 complete assets én eerste goedgekeurde uiting.
  const activatedAt = new Map<string, Date>();
  for (const ws of workspaces) {
    const approved = firstApproved.get(ws.id);
    if (approved && (completeCount.get(ws.id) ?? 0) >= 3) activatedAt.set(ws.id, approved);
  }

  // Weekbuckets (oudste eerst, incl. lopende week).
  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const start = new Date(windowStart.getTime() + i * 7 * 24 * 3600 * 1000);
    const end = new Date(start.getTime() + 7 * 24 * 3600 * 1000);
    const inRange = (d: Date) => d >= start && d < end;
    return {
      weekStart: start.toISOString().slice(0, 10),
      signups: users.filter((u) => inRange(u.createdAt)).length,
      workspacesCreated: workspaces.filter((w) => inRange(w.createdAt)).length,
      activations: [...activatedAt.values()].filter(inRange).length,
      newPaid: paidSubs.filter((s) => inRange(s.createdAt)).length,
    };
  });

  // Totalen + Gate-1-stand.
  const paidOrgIds = new Set(paidSubs.filter((s) => s.status === 'ACTIVE').map((s) => s.workspace.organizationId));
  const paidAgencyIds = new Set(
    paidSubs
      .filter((s) => s.status === 'ACTIVE' && s.workspace.organization.type === 'AGENCY')
      .map((s) => s.workspace.organizationId),
  );
  const cohort = workspaces.filter((w) => w.createdAt >= windowStart);
  const cohortActivated = cohort.filter((w) => activatedAt.has(w.id)).length;
  const activationPct = cohort.length > 0 ? Math.round((cohortActivated / cohort.length) * 100) : null;

  // Noordster uit Stripe — fail-soft: zonder key of bij storing nulls.
  let mrrEur: number | null = null;
  let netNewPerDay: { date: string; deltaEur: number }[] | null = null;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey && stripeKey !== 'sk_test_placeholder') {
    try {
      const stripe = getStripeClient();
      const active = await stripe.subscriptions.list({ status: 'active', limit: 100 });
      mrrEur = Math.round(
        active.data.reduce((sum, sub) => {
          return (
            sum +
            sub.items.data.reduce((s, item) => {
              const amount = (item.price.unit_amount ?? 0) / 100;
              const monthly = item.price.recurring?.interval === 'year' ? amount / 12 : amount;
              return s + monthly * (item.quantity ?? 1);
            }, 0)
          );
        }, 0),
      );

      const since = Math.floor((Date.now() - 14 * 24 * 3600 * 1000) / 1000);
      const recent = await stripe.subscriptions.list({ status: 'all', created: { gte: since }, limit: 100 });
      const canceled = await stripe.subscriptions.list({ status: 'canceled', limit: 100 });
      const perDay = new Map<string, number>();
      const dayKey = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10);
      const monthlyOf = (sub: (typeof recent.data)[number]) =>
        sub.items.data.reduce((s, item) => {
          const amount = (item.price.unit_amount ?? 0) / 100;
          return s + (item.price.recurring?.interval === 'year' ? amount / 12 : amount) * (item.quantity ?? 1);
        }, 0);
      for (const sub of recent.data) {
        const key = dayKey(sub.created);
        perDay.set(key, (perDay.get(key) ?? 0) + monthlyOf(sub));
      }
      for (const sub of canceled.data) {
        if (!sub.canceled_at || sub.canceled_at < since) continue;
        const key = dayKey(sub.canceled_at);
        perDay.set(key, (perDay.get(key) ?? 0) - monthlyOf(sub));
      }
      netNewPerDay = Array.from({ length: 14 }, (_, i) => {
        const date = new Date(Date.now() - (13 - i) * 24 * 3600 * 1000).toISOString().slice(0, 10);
        return { date, deltaEur: Math.round((perDay.get(date) ?? 0) * 100) / 100 };
      });
    } catch (err) {
      console.warn('[growth-metrics] Stripe-lezing faalde (fail-soft)', err);
    }
  }

  return NextResponse.json({
    generatedAt: now.toISOString(),
    definitions: {
      activation: '≥3 volledig ingevulde merk-assets én eerste accept/publicatie (DNA gemeten op nu — v1)',
      paid: 'Subscription met stripeSubscriptionId, status ACTIVE',
    },
    weeks,
    totals: {
      paidCustomers: paidOrgIds.size,
      paidAgencies: paidAgencyIds.size,
      activatedWorkspaces: activatedAt.size,
      activationPctLast8w: activationPct,
      mrrEur,
    },
    northStar: { netNewPerDay },
    gate: {
      ...GATE_1,
      current: {
        mrrEur,
        customers: paidOrgIds.size,
        agencies: paidAgencyIds.size,
        activationPct,
      },
    },
  });
}
