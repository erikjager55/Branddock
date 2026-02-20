// =============================================================
// Metered Billing — AI usage overage reporting to Stripe
//
// Flow:
//  1. AI calls are logged in AiUsageRecord (via usage-tracker.ts)
//  2. Daily cron (or invoice.upcoming webhook) triggers:
//     - calculateOverage() → tokens used minus included bundle
//     - reportUsageToStripe() → Stripe Billing Meter Events API
//  3. Stripe adds overage charge to next invoice
//
// All functions are no-op when BILLING_ENABLED=false.
//
// Requires a Billing Meter configured in Stripe Dashboard with:
//  - event_name matching METER_EVENT_NAME (default: 'ai_token_overage')
//  - customer_mapping.event_payload_key = 'stripe_customer_id'
//  - value_settings.event_payload_key = 'value'
// =============================================================

import { prisma } from '@/lib/prisma';
import { getStripeClient } from './client';
import { isBillingEnabled } from './feature-flags';
import { getWorkspacePlan } from './enforcement';
import { getUsageThisMonth } from './usage-tracker';
import { getAiOverageRate } from './plans';
import type { PlanTier } from '@/types/billing';

/**
 * The meter event name configured in the Stripe Dashboard.
 * Override via STRIPE_METER_EVENT_NAME env var.
 */
const METER_EVENT_NAME = process.env.STRIPE_METER_EVENT_NAME ?? 'ai_token_overage';

// ─── Overage calculation ────────────────────────────────────

export interface OverageResult {
  totalTokensUsed: number;
  includedTokens: number;
  overageTokens: number;
  overageCostEur: number;
  ratePer1kTokens: number | null;
  tier: PlanTier;
}

/**
 * Calculates AI token overage for a workspace's current billing period.
 * Returns 0 overage when billing is disabled or tier blocks overage.
 */
export async function calculateOverage(workspaceId: string): Promise<OverageResult> {
  const plan = await getWorkspacePlan(workspaceId);
  const usage = await getUsageThisMonth(workspaceId);
  const includedTokens = plan.limits.AI_TOKENS;
  const rate = getAiOverageRate(plan.tier);

  const overageTokens = Math.max(0, usage.totalTokens - includedTokens);
  const overageCostEur = rate !== null
    ? (overageTokens / 1000) * rate
    : 0;

  return {
    totalTokensUsed: usage.totalTokens,
    includedTokens: isFinite(includedTokens) ? includedTokens : 0,
    overageTokens,
    overageCostEur: Math.round(overageCostEur * 100) / 100, // round to cents
    ratePer1kTokens: rate,
    tier: plan.tier,
  };
}

// ─── Report usage to Stripe ─────────────────────────────────

export interface UsageReportResult {
  reported: boolean;
  overageTokens: number;
  overageCostEur: number;
  stripeMeterEventId?: string;
  reason?: string;
}

/**
 * Reports AI token overage to Stripe via the Billing Meter Events API.
 * Creates a meter event with the overage quantity (in units of 1K tokens).
 *
 * Requires:
 * - A Billing Meter configured in the Stripe Dashboard
 * - Workspace must have a stripeCustomerId
 *
 * No-op when:
 * - BILLING_ENABLED=false
 * - No overage (usage within included bundle)
 * - Tier blocks overage (FREE plan)
 * - Workspace has no Stripe customer
 */
export async function reportUsageToStripe(
  workspaceId: string,
): Promise<UsageReportResult> {
  // Skip when billing is disabled
  if (!isBillingEnabled()) {
    return { reported: false, overageTokens: 0, overageCostEur: 0, reason: 'billing_disabled' };
  }

  // Calculate overage
  const overage = await calculateOverage(workspaceId);

  if (overage.overageTokens <= 0) {
    return { reported: false, overageTokens: 0, overageCostEur: 0, reason: 'no_overage' };
  }

  if (overage.ratePer1kTokens === null) {
    return { reported: false, overageTokens: overage.overageTokens, overageCostEur: 0, reason: 'overage_blocked_on_tier' };
  }

  // Find workspace with Stripe customer ID
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { stripeCustomerId: true },
  });

  if (!workspace?.stripeCustomerId) {
    return { reported: false, overageTokens: overage.overageTokens, overageCostEur: overage.overageCostEur, reason: 'no_stripe_customer' };
  }

  try {
    const stripe = getStripeClient();

    // Report usage via Billing Meter Events API (in units of 1K tokens)
    const usageQuantity = Math.ceil(overage.overageTokens / 1000);

    const meterEvent = await stripe.billing.meterEvents.create({
      event_name: METER_EVENT_NAME,
      payload: {
        stripe_customer_id: workspace.stripeCustomerId,
        value: String(usageQuantity),
      },
      timestamp: Math.floor(Date.now() / 1000),
    });

    // Update subscription record with usage tracking info
    await prisma.subscription.updateMany({
      where: { workspaceId },
      data: {
        stripeCurrentPeriodUsage: overage.totalTokensUsed,
        usageReportedAt: new Date(),
      },
    });

    return {
      reported: true,
      overageTokens: overage.overageTokens,
      overageCostEur: overage.overageCostEur,
      stripeMeterEventId: meterEvent.identifier ?? undefined,
    };
  } catch (err) {
    console.error('[reportUsageToStripe] Stripe API error:', err);
    return { reported: false, overageTokens: overage.overageTokens, overageCostEur: overage.overageCostEur, reason: 'stripe_api_error' };
  }
}

// ─── Bulk report for all active subscriptions ───────────────

/**
 * Reports usage to Stripe for all workspaces with active subscriptions.
 * Intended to be called by a daily cron job.
 */
export async function reportUsageForAllWorkspaces(): Promise<{
  total: number;
  reported: number;
  skipped: number;
  errors: number;
}> {
  if (!isBillingEnabled()) {
    return { total: 0, reported: 0, skipped: 0, errors: 0 };
  }

  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      stripeSubscriptionId: { not: null },
    },
    select: { workspaceId: true },
  });

  let reported = 0;
  let skipped = 0;
  let errors = 0;

  for (const sub of subscriptions) {
    try {
      const result = await reportUsageToStripe(sub.workspaceId);
      if (result.reported) {
        reported++;
      } else {
        skipped++;
      }
    } catch {
      errors++;
    }
  }

  return { total: subscriptions.length, reported, skipped, errors };
}
