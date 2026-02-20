// =============================================================
// One-time Purchases — Stripe Payment Intents for workshops,
// research bundles, and other one-off purchases.
//
// Integrates with existing BundlePurchase model (S5).
// When BILLING_ENABLED=false, purchases are free (no Stripe).
// =============================================================

import { prisma } from '@/lib/prisma';
import { getStripeClient } from './client';
import { STRIPE_CURRENCY } from './config';
import { isBillingEnabled } from './feature-flags';

// ─── Types ──────────────────────────────────────────────────

export type PurchaseType = 'research_bundle' | 'workshop';

export interface CreatePaymentIntentParams {
  workspaceId: string;
  userId: string;
  type: PurchaseType;
  itemId: string;        // bundleId or workshopBundleId
  amountEur: number;     // price in EUR (e.g. 99.00)
  description?: string;
}

export interface PaymentIntentResult {
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  /** When billing disabled, purchase is auto-completed without payment */
  autoCompleted?: boolean;
  error?: string;
}

export interface HandlePurchaseParams {
  paymentIntentId: string;
  workspaceId: string;
  type: PurchaseType;
  itemId: string;
}

// ─── Create Payment Intent ──────────────────────────────────

/**
 * Creates a Stripe Payment Intent for a one-time purchase.
 * When billing is disabled, returns autoCompleted=true (no Stripe call).
 *
 * Metadata stored on the Payment Intent:
 * - workspaceId, type, itemId — used by webhook to find the purchase
 */
export async function createPaymentIntent(
  params: CreatePaymentIntentParams,
): Promise<PaymentIntentResult> {
  const { workspaceId, userId, type, itemId, amountEur, description } = params;

  // When billing is disabled, auto-complete the purchase
  if (!isBillingEnabled()) {
    await completePurchase({ workspaceId, type, itemId, pricePaid: 0 });
    return { success: true, autoCompleted: true };
  }

  if (amountEur <= 0) {
    // Free items don't need a Payment Intent
    await completePurchase({ workspaceId, type, itemId, pricePaid: 0 });
    return { success: true, autoCompleted: true };
  }

  try {
    // Find or create Stripe customer
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { stripeCustomerId: true, name: true },
    });

    let stripeCustomerId = workspace?.stripeCustomerId;

    if (!stripeCustomerId) {
      // Look up workspace owner's email for customer creation
      const owner = await prisma.organizationMember.findFirst({
        where: {
          organization: { workspaces: { some: { id: workspaceId } } },
          role: 'owner',
        },
        include: { user: { select: { email: true, name: true } } },
      });

      const stripe = getStripeClient();
      const customer = await stripe.customers.create({
        email: owner?.user.email ?? undefined,
        name: workspace?.name ?? undefined,
        metadata: { workspaceId },
      });

      stripeCustomerId = customer.id;

      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { stripeCustomerId: customer.id },
      });
    }

    const stripe = getStripeClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountEur * 100), // Convert to cents
      currency: STRIPE_CURRENCY,
      customer: stripeCustomerId,
      description: description ?? `Branddock ${type}: ${itemId}`,
      metadata: {
        workspaceId,
        userId,
        type,
        itemId,
      },
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret ?? undefined,
      paymentIntentId: paymentIntent.id,
    };
  } catch (err) {
    console.error('[createPaymentIntent] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Payment creation failed',
    };
  }
}

// ─── Handle successful payment ──────────────────────────────

/**
 * Handles a successful payment. Called by webhook (payment_intent.succeeded)
 * or directly when billing is disabled.
 */
export async function handlePurchaseSuccess(
  params: HandlePurchaseParams,
): Promise<void> {
  const { workspaceId, type, itemId } = params;

  // Look up original price from the Payment Intent
  let pricePaid = 0;
  if (isBillingEnabled() && params.paymentIntentId) {
    try {
      const stripe = getStripeClient();
      const pi = await stripe.paymentIntents.retrieve(params.paymentIntentId);
      pricePaid = pi.amount / 100; // Convert cents to EUR
    } catch {
      // If we can't retrieve, use 0
    }
  }

  await completePurchase({ workspaceId, type, itemId, pricePaid });
}

// ─── Internal: complete purchase in database ────────────────

async function completePurchase(params: {
  workspaceId: string;
  type: PurchaseType;
  itemId: string;
  pricePaid: number;
}): Promise<void> {
  const { workspaceId, type, itemId, pricePaid } = params;

  if (type === 'research_bundle') {
    // Update BundlePurchase status to PAID
    await prisma.bundlePurchase.updateMany({
      where: {
        bundleId: itemId,
        workspaceId,
        status: 'PENDING',
      },
      data: {
        status: 'PAID',
        pricePaid,
      },
    });

    // Also create/update PurchasedBundle for tool unlocking
    const bundle = await prisma.researchBundle.findUnique({
      where: { id: itemId },
      include: { methods: true },
    });

    if (bundle) {
      const toolIds = bundle.methods.map((m) => m.methodName);
      await prisma.purchasedBundle.upsert({
        where: { workspaceId_bundleId: { workspaceId, bundleId: itemId } },
        create: {
          bundleId: itemId,
          unlockedTools: toolIds,
          workspaceId,
        },
        update: {
          unlockedTools: toolIds,
        },
      });
    }
  } else if (type === 'workshop') {
    // Mark workshop as purchased
    await prisma.workshop.updateMany({
      where: {
        id: itemId,
        workspaceId,
        status: 'TO_BUY',
      },
      data: {
        status: 'PURCHASED',
        purchasedAt: new Date(),
        totalPrice: pricePaid,
      },
    });
  }
}
