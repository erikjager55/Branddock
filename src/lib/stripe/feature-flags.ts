// =============================================================
// Feature flags — billing enabled/disabled gate
//
// BILLING_ENABLED=false (default): app is fully free, no Stripe
// BILLING_ENABLED=true: real plan enforcement via Stripe
// =============================================================

import type { BillingMode, EffectivePlan } from '@/types/billing';
import { PLAN_CONFIGS, INFINITY_LIMITS } from '@/lib/constants/plan-limits';

// ─── Feature flag check ─────────────────────────────────────

/**
 * Returns true if billing is enabled via env var.
 * Works on both server and client (NEXT_PUBLIC_ prefix).
 */
export function isBillingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true';
}

// ─── Billing mode ───────────────────────────────────────────

/**
 * Returns the current billing mode:
 * - 'disabled': no billing, everything free
 * - 'test': Stripe test mode (sk_test_ keys)
 * - 'live': Stripe live mode (sk_live_ keys)
 */
export function getBillingMode(): BillingMode {
  if (!isBillingEnabled()) return 'disabled';

  const secretKey = process.env.STRIPE_SECRET_KEY ?? '';
  if (secretKey.startsWith('sk_live_')) return 'live';
  return 'test';
}

// ─── Effective plan (when billing is disabled) ──────────────

/**
 * Returns the effective plan. When billing is disabled,
 * always returns ENTERPRISE with Infinity limits so the
 * entire app works without restrictions.
 */
export function getEffectivePlan(): EffectivePlan {
  if (!isBillingEnabled()) {
    return {
      tier: 'ENTERPRISE',
      name: 'Free Beta',
      limits: INFINITY_LIMITS,
      isFreeBeta: true,
    };
  }

  // When billing IS enabled, this returns the default free plan.
  // The actual workspace plan should be resolved from the database
  // via getWorkspacePlan() in enforcement.ts (S10.3).
  return {
    tier: 'FREE',
    name: PLAN_CONFIGS.FREE.name,
    limits: PLAN_CONFIGS.FREE.limits,
    isFreeBeta: false,
  };
}
