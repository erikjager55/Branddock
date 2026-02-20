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

    default:
      // Event type not handled
      return false;
  }
}
