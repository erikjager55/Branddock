// =============================================================
// GET /api/billing/balance — credit-status voor de actieve workspace-org.
//
// Levert de billing-UX (Fase 6) alles in één call: pooled saldo, reserved/
// available, trial-status, unlimited-vlag, tier + maandbundel. Auth: elk lid
// (viewers mogen hun saldo zien).
// =============================================================

import { NextResponse } from 'next/server';
import { requireWorkspaceRole } from '@/lib/auth/require-role';
import { resolveOrgForWorkspace } from '@/lib/stripe/usage-tracker';
import { getBalance } from '@/lib/billing/credits/ledger';
import { isOrgUnlimited } from '@/lib/billing/credits/exempt';
import { getTrialState } from '@/lib/billing/credits/trial';
import { isCreditsEnabled } from '@/lib/stripe/feature-flags';
import { PLAN_CONFIGS } from '@/lib/constants/plan-limits';
import { prisma } from '@/lib/prisma';
import type { PlanTier } from '@/types/billing';

export async function GET() {
  const role = await requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']);
  if (role instanceof NextResponse) return role;
  const workspaceId = role.workspaceId;

  // Billing-uit → gratis/onbeperkt, zonder de credit-kolommen te raken (deploy-safety
  // vóór de Neon `db push`).
  if (!isCreditsEnabled()) {
    return NextResponse.json({
      billingEnabled: false,
      unlimited: true,
      balance: 0,
      reserved: 0,
      available: 0,
      tier: 'ENTERPRISE' as PlanTier,
      monthlyCredits: 0,
      trialEndsAt: null,
      trialDaysLeft: null,
      isLocked: false,
      isTrialing: false,
    });
  }

  const organizationId = await resolveOrgForWorkspace(workspaceId);
  if (!organizationId) {
    return NextResponse.json({ error: 'No organization for workspace' }, { status: 404 });
  }

  const [balance, unlimited, org, ws, trialState] = await Promise.all([
    getBalance(organizationId),
    isOrgUnlimited(organizationId),
    prisma.organization.findUnique({ where: { id: organizationId }, select: { trialEndsAt: true } }),
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { planTier: true } }),
    getTrialState(organizationId),
  ]);

  const tier = (ws?.planTier ?? 'FREE') as PlanTier;
  const monthlyCredits = PLAN_CONFIGS[tier]?.monthlyCredits ?? 0;
  const trialEndsAt = org?.trialEndsAt ?? null;
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : null;

  return NextResponse.json({
    billingEnabled: isCreditsEnabled(),
    unlimited,
    balance: balance.balance,
    reserved: balance.reserved,
    available: balance.available,
    tier,
    monthlyCredits,
    trialEndsAt,
    trialDaysLeft,
    // Fase 4: verlopen no-card trial zonder conversie → generatie + nieuwe
    // items dicht (UI toont lock-banner). isTrialing onderscheidt een échte
    // lopende trial van een geconverteerde org met een rest-trialEndsAt.
    isLocked: trialState.isLocked,
    isTrialing: trialState.isTrialing,
  });
}
