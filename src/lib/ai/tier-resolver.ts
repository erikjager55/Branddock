// =============================================================
// Workspace → RateLimitTier resolver (9.6 M8)
//
// The `withAi()` middleware needs a RateLimitTier per request so
// PRO/AGENCY workspaces get higher AI throughput than FREE tier.
// Reads `Workspace.planTier` (PlanTier enum: FREE/PRO/AGENCY/
// ENTERPRISE) and maps it to the rate limiter's tier names.
//
// Cache: in-memory 5 minute TTL per workspaceId. A plan change
// via Stripe webhook updates the DB; we accept up to 5 minutes
// of stale throttling rather than hitting Prisma on every AI call.
// =============================================================

import { prisma } from '@/lib/prisma';
import type { RateLimitTier } from './rate-limiter';

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  tier: RateLimitTier;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/** ENTERPRISE gets the AGENCY bucket until we add a dedicated tier. */
function mapPlanTier(
  planTier: 'FREE' | 'PRO' | 'STARTER' | 'GROWTH' | 'AGENCY' | 'ENTERPRISE',
): RateLimitTier {
  switch (planTier) {
    case 'PRO': // legacy
    case 'STARTER':
      return 'PRO';
    case 'GROWTH':
    case 'AGENCY':
    case 'ENTERPRISE':
      return 'AGENCY';
    case 'FREE':
    default:
      return 'FREE';
  }
}

/**
 * Read the workspace's plan tier and map it to the rate limiter's tier.
 * Falls back to FREE if the workspace can't be read (matches the old
 * hardcoded default — no accidental limit raising on error).
 */
export async function resolveWorkspaceTier(
  workspaceId: string,
): Promise<RateLimitTier> {
  const cached = cache.get(workspaceId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tier;
  }

  let tier: RateLimitTier = 'FREE';
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { planTier: true },
    });
    if (workspace) {
      tier = mapPlanTier(workspace.planTier);
    }
  } catch (err) {
    console.warn('[tier-resolver] Failed to read workspace plan, using FREE:', err);
  }

  cache.set(workspaceId, { tier, expiresAt: Date.now() + CACHE_TTL_MS });
  return tier;
}

/** Drop the cached tier for a workspace — call after a plan change. */
export function invalidateWorkspaceTier(workspaceId: string): void {
  cache.delete(workspaceId);
}
