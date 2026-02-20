// =============================================================
// Plan helpers — query limits and check feature access
//
// Central place for "can this workspace do X?" logic.
// When billing is disabled, everything is allowed.
// =============================================================

import type { PlanTier, FeatureKey, PlanLimits } from '@/types/billing';
import { PLAN_LIMITS, PLAN_CONFIGS, INFINITY_LIMITS } from '@/lib/constants/plan-limits';
import { isBillingEnabled } from './feature-flags';

// ─── Get limits for a tier ──────────────────────────────────

/**
 * Returns the plan limits for a given tier.
 * When billing is disabled, returns Infinity limits.
 */
export function getPlanLimits(tier: PlanTier): PlanLimits {
  if (!isBillingEnabled()) return INFINITY_LIMITS;
  return PLAN_LIMITS[tier];
}

// ─── Get a single limit ────────────────────────────────────

/**
 * Returns the limit for a specific feature on a specific tier.
 * When billing is disabled, returns Infinity.
 */
export function getFeatureLimit(tier: PlanTier, feature: FeatureKey): number {
  if (!isBillingEnabled()) return Infinity;
  return PLAN_LIMITS[tier][feature];
}

// ─── Check if a feature action is allowed ───────────────────

/**
 * Returns true if the current count is below the plan limit.
 * When billing is disabled, always returns true.
 */
export function isPlanFeatureAllowed(
  tier: PlanTier,
  feature: FeatureKey,
  currentCount: number,
): boolean {
  if (!isBillingEnabled()) return true;
  const limit = PLAN_LIMITS[tier][feature];
  return currentCount < limit;
}

// ─── Check if tier has a specific capability ────────────────

/**
 * Returns true if the tier includes the given capability level.
 * Used for CONTENT_STUDIO (1=basic, 2=full, 3=templates, 4=custom)
 * and EXPORT_FORMATS (0=none, 1=PDF, 2=PDF+DOCX, 3=all).
 */
export function hasTierCapability(
  tier: PlanTier,
  feature: FeatureKey,
  requiredLevel: number,
): boolean {
  if (!isBillingEnabled()) return true;
  return PLAN_LIMITS[tier][feature] >= requiredLevel;
}

// ─── Check if tier can use AI overage ───────────────────────

/**
 * Returns the per-1K-token overage price for a tier, or null if blocked.
 */
export function getAiOverageRate(tier: PlanTier): number | null {
  if (!isBillingEnabled()) return null; // no overage in free beta
  return PLAN_CONFIGS[tier].aiOveragePer1kTokens;
}

// ─── Compare tiers ──────────────────────────────────────────

const TIER_ORDER: Record<PlanTier, number> = {
  FREE: 0,
  PRO: 1,
  AGENCY: 2,
  ENTERPRISE: 3,
};

/**
 * Returns true if tierA is a higher plan than tierB.
 */
export function isHigherTier(tierA: PlanTier, tierB: PlanTier): boolean {
  return TIER_ORDER[tierA] > TIER_ORDER[tierB];
}

/**
 * Returns true if the tier can be upgraded (is not already Enterprise).
 */
export function canUpgrade(tier: PlanTier): boolean {
  if (!isBillingEnabled()) return false;
  return tier !== 'ENTERPRISE';
}
