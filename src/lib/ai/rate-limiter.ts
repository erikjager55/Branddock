// =============================================================
// Rate Limiter (R0.8)
//
// In-memory, per-workspace rate limiting with 3 tiers:
//  - FREE:    20 req/min,  200 req/day
//  - PRO:     60 req/min,  1000 req/day
//  - AGENCY:  120 req/min, 5000 req/day
//
// Sliding window approach. Resets daily at midnight UTC.
// Production TODO: swap in-memory store for Redis.
// =============================================================

// ─── Types ─────────────────────────────────────────────────

export type RateLimitTier = 'FREE' | 'PRO' | 'AGENCY';

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  tier: RateLimitTier;
}

// ─── Tier configuration ────────────────────────────────────

const TIER_LIMITS: Record<RateLimitTier, RateLimitConfig> = {
  FREE:   { requestsPerMinute: 20,  requestsPerDay: 200 },
  PRO:    { requestsPerMinute: 60,  requestsPerDay: 1000 },
  AGENCY: { requestsPerMinute: 120, requestsPerDay: 5000 },
};

// ─── In-memory store ───────────────────────────────────────

interface BucketEntry {
  timestamps: number[];
  dailyCount: number;
  dailyResetAt: number; // unix ms (midnight UTC)
}

const store = new Map<string, BucketEntry>();

function getNextMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0,
  ));
  return midnight.getTime();
}

function getOrCreateBucket(key: string): BucketEntry {
  let entry = store.get(key);
  const now = Date.now();

  if (!entry || now >= entry.dailyResetAt) {
    entry = {
      timestamps: [],
      dailyCount: 0,
      dailyResetAt: getNextMidnightUTC(),
    };
    store.set(key, entry);
  }

  return entry;
}

// ─── Core check ────────────────────────────────────────────

/**
 * Check whether a request is allowed and consume a token.
 *
 * @param workspaceId  - unique workspace identifier
 * @param tier         - billing tier (determines limits)
 * @returns            - { allowed, remaining, resetAt, tier }
 */
export function checkRateLimit(
  workspaceId: string,
  tier: RateLimitTier = 'FREE',
): RateLimitResult {
  const config = TIER_LIMITS[tier];
  const key = `ai:${workspaceId}`;
  const bucket = getOrCreateBucket(key);
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;

  // Prune expired timestamps (older than 1 minute)
  bucket.timestamps = bucket.timestamps.filter((t) => t > oneMinuteAgo);

  // Check per-minute limit
  if (bucket.timestamps.length >= config.requestsPerMinute) {
    const oldestInWindow = bucket.timestamps[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(oldestInWindow + 60_000),
      tier,
    };
  }

  // Check daily limit
  if (bucket.dailyCount >= config.requestsPerDay) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(bucket.dailyResetAt),
      tier,
    };
  }

  // Consume a token
  bucket.timestamps.push(now);
  bucket.dailyCount += 1;

  const minuteRemaining = config.requestsPerMinute - bucket.timestamps.length;
  const dailyRemaining = config.requestsPerDay - bucket.dailyCount;

  return {
    allowed: true,
    remaining: Math.min(minuteRemaining, dailyRemaining),
    resetAt: new Date(now + 60_000),
    tier,
  };
}

/**
 * Get current rate limit status without consuming a token.
 */
export function getRateLimitStatus(
  workspaceId: string,
  tier: RateLimitTier = 'FREE',
): Omit<RateLimitResult, 'allowed'> & { minuteUsed: number; dailyUsed: number } {
  const config = TIER_LIMITS[tier];
  const key = `ai:${workspaceId}`;
  const bucket = getOrCreateBucket(key);
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;

  const recentTimestamps = bucket.timestamps.filter((t) => t > oneMinuteAgo);

  return {
    remaining: Math.min(
      config.requestsPerMinute - recentTimestamps.length,
      config.requestsPerDay - bucket.dailyCount,
    ),
    resetAt: new Date(now + 60_000),
    tier,
    minuteUsed: recentTimestamps.length,
    dailyUsed: bucket.dailyCount,
  };
}

/**
 * Reset rate limits for a workspace (useful for testing).
 */
export function resetRateLimit(workspaceId: string): void {
  store.delete(`ai:${workspaceId}`);
}
