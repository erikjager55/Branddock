// =============================================================
// Subscription sync — Stripe → database synchronization
//
// Maps Stripe subscription data to our Prisma Subscription model.
// Called from webhook handlers after subscription lifecycle events.
// =============================================================

import type Stripe from "stripe";
import prisma from "@/lib/prisma";
import type { PlanTier } from "@/types/billing";
import { resolveWorkspaceFromCustomer } from "./customer";

// ─── Map Stripe status → our SubscriptionStatus enum ────────

type DbSubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "UNPAID";

export function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): DbSubscriptionStatus {
  switch (stripeStatus) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    case "unpaid":
      return "UNPAID";
    case "incomplete":
      return "ACTIVE"; // treat as active until payment fails
    case "paused":
      return "PAST_DUE"; // treat paused as past_due for enforcement
    default:
      return "ACTIVE";
  }
}

// ─── Map Stripe price → PlanTier ────────────────────────────

export function mapPriceToTier(priceId: string | null): PlanTier {
  if (!priceId) return "FREE";

  const proPriceId = process.env.STRIPE_PRICE_PRO_MONTHLY;
  const agencyPriceId = process.env.STRIPE_PRICE_AGENCY_MONTHLY;
  const enterprisePriceId = process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY;

  if (priceId === proPriceId) return "PRO";
  if (priceId === agencyPriceId) return "AGENCY";
  if (priceId === enterprisePriceId) return "ENTERPRISE";

  // Check subscription metadata as fallback
  return "FREE";
}

// ─── Sync a Stripe subscription to our database ─────────────

/**
 * Syncs a Stripe subscription object to our Prisma Subscription + Workspace.
 * Creates the Subscription record if it doesn't exist.
 * Updates planTier on the Workspace for quick access.
 */
export async function syncSubscription(
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  const customerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer.id;

  // Resolve workspace
  const workspaceId = await resolveWorkspaceFromCustomer(customerId);
  if (!workspaceId) {
    console.warn(
      `[subscription-sync] No workspace found for Stripe customer ${customerId}`
    );
    return;
  }

  const status = mapStripeStatus(stripeSubscription.status);
  const firstItem = stripeSubscription.items.data[0];
  const priceId = firstItem?.price?.id ?? null;
  const planTier = mapPriceToTier(priceId);
  const billingInterval = firstItem?.price?.recurring?.interval;

  // Period comes from the subscription item in newer Stripe API versions
  const periodStart = firstItem?.current_period_start
    ? new Date(firstItem.current_period_start * 1000)
    : new Date();
  const periodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // fallback: 30 days

  // Find or create Plan record by slug
  const plan = await findOrCreatePlan(planTier);

  // Upsert subscription record
  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: stripeSubscription.id },
    create: {
      workspaceId,
      planId: plan.id,
      status,
      billingCycle: billingInterval === "year" ? "YEARLY" : "MONTHLY",
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: priceId,
    },
    update: {
      planId: plan.id,
      status,
      billingCycle: billingInterval === "year" ? "YEARLY" : "MONTHLY",
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      stripePriceId: priceId,
    },
  });

  // Update workspace planTier for quick access
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { planTier },
  });
}

// ─── Update plan from Stripe (manual sync) ──────────────────

/**
 * Fetches the latest subscription from Stripe and syncs it to our database.
 * Used for manual reconciliation.
 */
export async function updatePlanFromStripe(
  workspaceId: string,
  stripe: Stripe
): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { stripeCustomerId: true },
  });

  if (!workspace?.stripeCustomerId) {
    console.warn(
      `[subscription-sync] Workspace ${workspaceId} has no Stripe customer`
    );
    return;
  }

  // Fetch active subscriptions from Stripe
  const subscriptions = await stripe.subscriptions.list({
    customer: workspace.stripeCustomerId,
    status: "all",
    limit: 1,
  });

  if (subscriptions.data.length === 0) {
    // No subscription — mark as FREE
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { planTier: "FREE" },
    });
    // Delete subscription record if it exists
    await prisma.subscription.deleteMany({
      where: { workspaceId },
    });
    return;
  }

  // Sync the most recent subscription
  await syncSubscription(subscriptions.data[0]);
}

// ─── Handle subscription cancellation ───────────────────────

/**
 * Handles subscription deletion/cancellation.
 * Marks the subscription as CANCELED and falls back to FREE tier.
 */
export async function handleSubscriptionCanceled(
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  // First sync the subscription (status will be CANCELED)
  await syncSubscription(stripeSubscription);

  // If fully canceled (not just cancel_at_period_end), downgrade to FREE
  if (stripeSubscription.status === "canceled") {
    const customerId =
      typeof stripeSubscription.customer === "string"
        ? stripeSubscription.customer
        : stripeSubscription.customer.id;

    const workspaceId = await resolveWorkspaceFromCustomer(customerId);
    if (workspaceId) {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { planTier: "FREE" },
      });
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────

async function findOrCreatePlan(tier: PlanTier) {
  const slug = tier.toLowerCase();
  const existing = await prisma.plan.findUnique({ where: { slug } });
  if (existing) return existing;

  // Create plan from our config
  const { PLAN_CONFIGS } = await import("@/lib/constants/plan-limits");
  const config = PLAN_CONFIGS[tier];

  return prisma.plan.create({
    data: {
      name: config.name,
      slug,
      monthlyPrice: config.monthlyPriceEur,
      maxSeats: config.limits.TEAM_MEMBERS,
      maxAiGenerations: config.limits.AI_TOKENS,
      maxResearchStudies: 5,
      maxStorageGb: config.limits.STORAGE_MB / 1024,
      features: config.features,
      isRecommended: tier === "PRO",
      sortOrder: ["FREE", "PRO", "AGENCY", "ENTERPRISE"].indexOf(tier),
    },
  });
}
