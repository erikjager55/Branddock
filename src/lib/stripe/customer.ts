// =============================================================
// Stripe Customer — workspace ↔ Stripe customer mapping
//
// Each workspace gets its own Stripe customer.
// The customer ID is stored on the Workspace model.
// =============================================================

import type Stripe from "stripe";
import prisma from "@/lib/prisma";
import { getStripeClient } from "./client";

// ─── Get or create Stripe customer for a workspace ──────────

/**
 * Finds the existing Stripe customer for a workspace, or creates a new one.
 * Links the Stripe customer ID back to the workspace in our database.
 */
export async function getOrCreateCustomer(
  workspaceId: string
): Promise<string> {
  // 1. Check if workspace already has a Stripe customer
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      stripeCustomerId: true,
      name: true,
      organization: {
        select: {
          name: true,
          members: {
            where: { role: "owner" },
            take: 1,
            select: { user: { select: { email: true, name: true } } },
          },
        },
      },
    },
  });

  if (!workspace) {
    throw new Error(`Workspace ${workspaceId} not found`);
  }

  // Already linked
  if (workspace.stripeCustomerId) {
    return workspace.stripeCustomerId;
  }

  // 2. Create Stripe customer
  const stripe = getStripeClient();
  const ownerEmail =
    workspace.organization.members[0]?.user.email ?? undefined;
  const ownerName = workspace.organization.members[0]?.user.name ?? undefined;

  const customer = await stripe.customers.create({
    name: workspace.organization.name,
    email: ownerEmail,
    metadata: {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      ownerName: ownerName ?? "",
    },
  });

  // 3. Link customer ID back to workspace
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

// ─── Link an existing Stripe customer to a workspace ────────

/**
 * Links a known Stripe customer ID to a workspace.
 * Used during webhook processing when we receive a customer ID from Stripe.
 */
export async function linkCustomerToWorkspace(
  stripeCustomerId: string,
  workspaceId: string
): Promise<void> {
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { stripeCustomerId },
  });
}

// ─── Resolve workspace from Stripe customer ID ─────────────

/**
 * Finds the workspace associated with a Stripe customer ID.
 * Returns null if no workspace is found.
 */
export async function resolveWorkspaceFromCustomer(
  stripeCustomerId: string
): Promise<string | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { stripeCustomerId },
    select: { id: true },
  });
  return workspace?.id ?? null;
}

// ─── Resolve workspace from Stripe subscription ────────────

/**
 * Finds the workspace associated with a Stripe subscription.
 * First checks our Subscription table, then falls back to customer metadata.
 */
export async function resolveWorkspaceFromSubscription(
  subscription: Stripe.Subscription
): Promise<string | null> {
  // Try our Subscription table first
  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: { workspaceId: true },
  });
  if (sub) return sub.workspaceId;

  // Fall back to customer metadata
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  return resolveWorkspaceFromCustomer(customerId);
}
