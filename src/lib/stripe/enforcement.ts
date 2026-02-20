// =============================================================
// Plan enforcement — check plan limits against current usage
//
// Core functions:
//  - getWorkspacePlan()  → resolve effective plan for a workspace
//  - getCurrentCount()   → count entities per feature key
//  - checkPlanLimit()    → allowed/denied check
//
// All enforcement is SKIPPED when BILLING_ENABLED=false.
// =============================================================

import { prisma } from '@/lib/prisma';
import type { PlanTier, FeatureKey, EffectivePlan } from '@/types/billing';
import { PLAN_LIMITS } from '@/lib/constants/plan-limits';
import { isBillingEnabled, getEffectivePlan } from './feature-flags';

// ─── PlanLimitError ─────────────────────────────────────────

export class PlanLimitError extends Error {
  public readonly feature: FeatureKey;
  public readonly limit: number;
  public readonly current: number;
  public readonly tier: PlanTier;

  constructor(feature: FeatureKey, limit: number, current: number, tier: PlanTier) {
    super(`Plan limit reached for ${feature}: ${current}/${limit} on ${tier} plan`);
    this.name = 'PlanLimitError';
    this.feature = feature;
    this.limit = limit;
    this.current = current;
    this.tier = tier;
  }
}

// ─── CheckResult type ───────────────────────────────────────

export interface PlanLimitCheck {
  allowed: boolean;
  feature: FeatureKey;
  current: number;
  limit: number;
  tier: PlanTier;
}

// ─── Get workspace plan ─────────────────────────────────────

/**
 * Resolves the effective plan for a workspace.
 * When billing is disabled, returns ENTERPRISE with Infinity limits.
 * When billing is enabled, reads planTier from database.
 */
export async function getWorkspacePlan(workspaceId: string): Promise<EffectivePlan> {
  if (!isBillingEnabled()) {
    return getEffectivePlan(); // ENTERPRISE + Infinity limits
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { planTier: true },
  });

  if (!workspace) {
    // Default to FREE if workspace not found
    return {
      tier: 'FREE',
      name: 'Free',
      limits: PLAN_LIMITS.FREE,
      isFreeBeta: false,
    };
  }

  const tier = workspace.planTier as PlanTier;
  return {
    tier,
    name: tier.charAt(0) + tier.slice(1).toLowerCase(),
    limits: PLAN_LIMITS[tier],
    isFreeBeta: false,
  };
}

// ─── Get current count per feature ──────────────────────────

/**
 * Returns the current usage count for a feature in a workspace.
 * Maps FeatureKey to the appropriate Prisma count query.
 */
export async function getCurrentCount(
  workspaceId: string,
  feature: FeatureKey,
): Promise<number> {
  switch (feature) {
    case 'BRAND_ASSETS':
      return prisma.brandAsset.count({ where: { workspaceId } });

    case 'PERSONAS':
      return prisma.persona.count({ where: { workspaceId } });

    case 'CAMPAIGNS':
      return prisma.campaign.count({ where: { workspaceId, isArchived: false } });

    case 'PRODUCTS':
      return prisma.product.count({ where: { workspaceId } });

    case 'MARKET_INSIGHTS':
      return prisma.marketInsight.count({ where: { workspaceId } });

    case 'KNOWLEDGE_RESOURCES':
      return prisma.knowledgeResource.count({ where: { workspaceId, isArchived: false } });

    case 'WORKSPACES': {
      // Count workspaces in the same organization
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { organizationId: true },
      });
      if (!workspace) return 0;
      return prisma.workspace.count({
        where: { organizationId: workspace.organizationId },
      });
    }

    case 'TEAM_MEMBERS': {
      // Count organization members
      const ws = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { organizationId: true },
      });
      if (!ws) return 0;
      return prisma.organizationMember.count({
        where: { organizationId: ws.organizationId, isActive: true },
      });
    }

    case 'AI_TOKENS': {
      // Sum tokens this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const result = await prisma.aiUsageRecord.aggregate({
        where: { workspaceId, createdAt: { gte: startOfMonth } },
        _sum: { tokens: true },
      });
      return result._sum.tokens ?? 0;
    }

    case 'ALIGNMENT_SCANS_PER_WEEK': {
      // Count scans this week (Monday to Sunday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // Monday
      startOfWeek.setHours(0, 0, 0, 0);
      return prisma.alignmentScan.count({
        where: { workspaceId, startedAt: { gte: startOfWeek } },
      });
    }

    case 'STORAGE_MB':
      // Storage tracking not yet implemented — return 0
      return 0;

    case 'CONTENT_STUDIO':
    case 'EXPORT_FORMATS':
      // Capability levels, not counts — always return 0
      // Use hasTierCapability() from plans.ts instead
      return 0;

    default:
      return 0;
  }
}

// ─── Check plan limit ───────────────────────────────────────

/**
 * Checks if the current usage is within the plan limit for a feature.
 * When billing is disabled, always returns { allowed: true }.
 */
export async function checkPlanLimit(
  workspaceId: string,
  feature: FeatureKey,
): Promise<PlanLimitCheck> {
  if (!isBillingEnabled()) {
    return {
      allowed: true,
      feature,
      current: 0,
      limit: Infinity,
      tier: 'ENTERPRISE',
    };
  }

  const plan = await getWorkspacePlan(workspaceId);
  const limit = plan.limits[feature];
  const current = await getCurrentCount(workspaceId, feature);

  return {
    allowed: current < limit,
    feature,
    current,
    limit,
    tier: plan.tier,
  };
}

// ─── Enforce (throws on limit) ──────────────────────────────

/**
 * Enforces a plan limit — throws PlanLimitError if the limit is reached.
 * When billing is disabled, this is a no-op.
 */
export async function enforceFeature(
  workspaceId: string,
  feature: FeatureKey,
): Promise<void> {
  const check = await checkPlanLimit(workspaceId, feature);
  if (!check.allowed) {
    throw new PlanLimitError(feature, check.limit, check.current, check.tier);
  }
}
