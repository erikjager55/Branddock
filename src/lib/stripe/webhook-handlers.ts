// =============================================================
// Stripe webhook event handlers
//
// Each function handles a specific Stripe event type.
// Called from the webhook route after signature verification
// and idempotency check.
// =============================================================

import type Stripe from "stripe";
import prisma from "@/lib/prisma";
import {
  syncSubscription,
  handleSubscriptionCanceled,
} from "./subscription-sync";
import { resolveWorkspaceFromCustomer } from "./customer";
import { handlePurchaseSuccess, type PurchaseType } from "./one-time";
import { handleTopupSuccess } from "./topup";
import { resolveOrgForWorkspace } from "./usage-tracker";
import { updatePlanFromStripe } from "./subscription-sync";
import { getStripeClient } from "./client";
import { grantCredits } from "@/lib/billing/credits/ledger";
import { PLAN_CONFIGS } from "@/lib/constants/plan-limits";
import type { PlanTier } from "@/types/billing";

// ─── payment_intent.succeeded (one-time purchases) ──────────

/**
 * Triggered when a one-time PaymentIntent (research bundle / workshop) succeeds.
 * Completes the purchase (BundlePurchase → PAID + unlock). Ignores any other
 * PaymentIntent — guards on the metadata.type set by createPaymentIntent.
 */
async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent): Promise<void> {
  // Credit top-up (Fase 3): org-pooled credits toekennen via grantCredits('TOPUP').
  if (pi.metadata?.type === "credit_topup") {
    await handleTopupSuccess(pi);
    return;
  }
  const workspaceId = pi.metadata?.workspaceId;
  const type = pi.metadata?.type;
  const itemId = pi.metadata?.itemId;
  if (!workspaceId || !itemId || (type !== "research_bundle" && type !== "workshop")) {
    return;
  }
  await handlePurchaseSuccess({
    paymentIntentId: pi.id,
    workspaceId,
    type: type as PurchaseType,
    itemId,
  });
}

// ─── checkout.session.completed ─────────────────────────────

/**
 * Triggered when a Checkout Session completes successfully.
 * Links the Stripe customer to our workspace and syncs the subscription.
 */
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (!customerId) {
    console.warn("[webhook] checkout.session.completed: no customer ID");
    return;
  }

  // Link customer to workspace if metadata contains workspaceId
  const workspaceId = session.metadata?.workspaceId;
  if (workspaceId) {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { stripeCustomerId: customerId },
    });
  }

  // If this was a subscription checkout, sync the subscription
  if (session.subscription) {
    const { getStripeClient } = await import("./client");
    const stripe = getStripeClient();
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await syncSubscription(subscription);
  }
}

// ─── customer.subscription.created ──────────────────────────

export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  await syncSubscription(subscription);
}

// ─── customer.subscription.updated ──────────────────────────

/**
 * Handles subscription updates: plan changes, upgrades/downgrades,
 * payment method changes, period renewals.
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  await syncSubscription(subscription);
}

// ─── customer.subscription.deleted ──────────────────────────

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  await handleSubscriptionCanceled(subscription);
}

// ─── customer.subscription.paused ───────────────────────────

export async function handleSubscriptionPaused(
  subscription: Stripe.Subscription
): Promise<void> {
  await syncSubscription(subscription);
}

// ─── invoice.paid ───────────────────────────────────────────

/**
 * Triggered when an invoice is successfully paid.
 * Creates/updates our Invoice record and resets AI usage counters.
 */
export async function handleInvoicePaid(
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id ?? null;

  if (!customerId) return;

  const workspaceId = await resolveWorkspaceFromCustomer(customerId);
  if (!workspaceId) {
    console.warn(
      `[webhook] invoice.paid: no workspace for customer ${customerId}`
    );
    return;
  }

  // Upsert Invoice record
  const invoiceNumber = invoice.number ?? `INV-${invoice.id.slice(-8)}`;

  await prisma.invoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      workspaceId,
      invoiceNumber,
      amount: (invoice.amount_paid ?? 0) / 100, // cents → euros
      currency: (invoice.currency ?? "eur").toUpperCase(),
      status: "PAID",
      periodStart: new Date((invoice.period_start ?? 0) * 1000),
      periodEnd: new Date((invoice.period_end ?? 0) * 1000),
      pdfUrl: invoice.invoice_pdf ?? null,
      issuedAt: new Date((invoice.created ?? 0) * 1000),
      stripeInvoiceId: invoice.id,
    },
    update: {
      amount: (invoice.amount_paid ?? 0) / 100,
      status: "PAID",
      pdfUrl: invoice.invoice_pdf ?? null,
    },
  });

  // Reset AI usage counter on the subscription for this new period
  await prisma.subscription.updateMany({
    where: { workspaceId },
    data: { stripeCurrentPeriodUsage: 0 },
  });

  // Plan-grant (Fase 3): ken de maandbundel toe bij een betaalde subscription-
  // invoice (initieel + elke cyclus). Idempotent per invoice; org-pooled → grant
  // op de org. FREE (monthlyCredits 0) en niet-subscription-invoices → geen grant.
  const isSubscriptionRenewal =
    invoice.billing_reason === "subscription_create" ||
    invoice.billing_reason === "subscription_cycle";
  if (isSubscriptionRenewal) {
    // Sync de subscription eerst zodat workspace.planTier vers is — de maandbundel is
    // dan order-onafhankelijk van de subscription.*/checkout-webhooks. (Een mis-ordered
    // invoice.paid las anders FREE → 0 credits, eenmalig en nooit hersteld.) Bij een
    // transiente sync-fout throwt dit → Stripe retryt → invoice-upsert + grant zijn
    // idempotent, dus veilig at-least-once.
    await updatePlanFromStripe(workspaceId, getStripeClient());

    const organizationId = await resolveOrgForWorkspace(workspaceId);
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { planTier: true },
    });
    const tier = (ws?.planTier ?? "FREE") as PlanTier;
    const monthlyCredits = PLAN_CONFIGS[tier]?.monthlyCredits ?? 0;
    if (organizationId && monthlyCredits > 0) {
      await grantCredits({
        organizationId,
        credits: monthlyCredits,
        type: "PLAN_GRANT",
        reason: `Maandbundel ${tier} (${monthlyCredits} credits)`,
        idempotencyKey: `plan-grant:${invoice.id}`,
      });
    }
  }
}

// ─── invoice.payment_failed ─────────────────────────────────

/**
 * Triggered when an invoice payment fails.
 * Marks the subscription as PAST_DUE.
 */
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id ?? null;

  if (!customerId) return;

  const workspaceId = await resolveWorkspaceFromCustomer(customerId);
  if (!workspaceId) return;

  // Update subscription status
  await prisma.subscription.updateMany({
    where: { workspaceId },
    data: { status: "PAST_DUE" },
  });

  // Create a failed Invoice record
  const invoiceNumber = invoice.number ?? `INV-${invoice.id.slice(-8)}`;
  await prisma.invoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      workspaceId,
      invoiceNumber,
      amount: (invoice.amount_due ?? 0) / 100,
      currency: (invoice.currency ?? "eur").toUpperCase(),
      status: "FAILED",
      periodStart: new Date((invoice.period_start ?? 0) * 1000),
      periodEnd: new Date((invoice.period_end ?? 0) * 1000),
      pdfUrl: invoice.invoice_pdf ?? null,
      issuedAt: new Date((invoice.created ?? 0) * 1000),
      stripeInvoiceId: invoice.id,
    },
    update: {
      status: "FAILED",
      amount: (invoice.amount_due ?? 0) / 100,
    },
  });
}

// ─── invoice.finalized ──────────────────────────────────────

/**
 * Triggered when an invoice is finalized (ready to be paid).
 * Updates the PDF URL on our Invoice record.
 */
export async function handleInvoiceFinalized(
  invoice: Stripe.Invoice
): Promise<void> {
  if (!invoice.invoice_pdf) return;

  // Only update if we already have this invoice
  const existing = await prisma.invoice.findUnique({
    where: { stripeInvoiceId: invoice.id },
  });
  if (!existing) return;

  await prisma.invoice.update({
    where: { stripeInvoiceId: invoice.id },
    data: { pdfUrl: invoice.invoice_pdf },
  });
}

// ─── Event dispatcher ───────────────────────────────────────

/**
 * Dispatches a Stripe event to the appropriate handler.
 * Returns true if the event was handled, false if ignored.
 */
export async function dispatchWebhookEvent(
  event: Stripe.Event
): Promise<boolean> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session
      );
      return true;

    case "customer.subscription.created":
      await handleSubscriptionCreated(
        event.data.object as Stripe.Subscription
      );
      return true;

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(
        event.data.object as Stripe.Subscription
      );
      return true;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(
        event.data.object as Stripe.Subscription
      );
      return true;

    case "customer.subscription.paused":
      await handleSubscriptionPaused(
        event.data.object as Stripe.Subscription
      );
      return true;

    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      return true;

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      return true;

    case "invoice.finalized":
      await handleInvoiceFinalized(event.data.object as Stripe.Invoice);
      return true;

    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(
        event.data.object as Stripe.PaymentIntent
      );
      return true;

    default:
      // Event type not handled
      return false;
  }
}
