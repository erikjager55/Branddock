// =============================================================
// Rate Limiter (R0.8 + 9.6 M1 / Fase 4.1)
//
// Sliding-window rate limiting with two storage backends:
//  - Upstash Redis (production) when UPSTASH_REDIS_REST_URL is set
//  - In-memory Map (local dev fallback, per-process only)
//
// AI-tier limits (per workspace):
//  - FREE:    20 req/min,  200 req/day
//  - PRO:     60 req/min,  1000 req/day
//  - AGENCY:  120 req/min, 5000 req/day
//
// Generic helper: checkGenericRateLimit(key, max, windowMs) — used by
// auth-rate-limiter and any future subsystem.
// =============================================================

import { redis } from '@/lib/redis';

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

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60_000;

// ─── In-memory store (dev fallback) ────────────────────────

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

function randomMember(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── AI per-workspace rate check (minute + day) ────────────

/**
 * Check whether a request is allowed and consume a token.
 * Applies both per-minute and per-day limits for the given tier.
 *
 * @param workspaceId  - unique workspace identifier
 * @param tier         - billing tier (determines limits)
 */
export async function checkRateLimit(
  workspaceId: string,
  tier: RateLimitTier = 'FREE',
): Promise<RateLimitResult> {
  const config = TIER_LIMITS[tier];
  const key = `ai:${workspaceId}`;
  const now = Date.now();

  if (redis) {
    // Single ZSET covers both windows; prune older than 24h and count with ZCOUNT.
    const windowStartDay = now - DAY_MS;
    const windowStartMinute = now - MINUTE_MS;

    // Prune very old entries
    await redis.zremrangebyscore(key, 0, windowStartDay);

    const [dayCount, minuteCount] = await Promise.all([
      redis.zcount(key, windowStartDay, '+inf'),
      redis.zcount(key, windowStartMinute, '+inf'),
    ]);

    if (minuteCount >= config.requestsPerMinute) {
      // Find the oldest entry in the minute window so we can report resetAt.
      const oldestInMinute = await redis.zrange<string[]>(
        key, windowStartMinute, '+inf', { byScore: true, offset: 0, count: 1 },
      );
      const oldestScore = oldestInMinute?.[0]
        ? Number.parseInt(oldestInMinute[0].split('-')[0] ?? '0', 10)
        : now;
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(oldestScore + MINUTE_MS),
        tier,
      };
    }

    if (dayCount >= config.requestsPerDay) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(getNextMidnightUTC()),
        tier,
      };
    }

    await redis.zadd(key, { score: now, member: randomMember() });
    // TTL slightly longer than window to survive clock skew / batched sweeps
    await redis.expire(key, Math.ceil(DAY_MS / 1000) + 60);

    return {
      allowed: true,
      remaining: Math.min(
        config.requestsPerMinute - minuteCount - 1,
        config.requestsPerDay - dayCount - 1,
      ),
      resetAt: new Date(now + MINUTE_MS),
      tier,
    };
  }

  // In-memory fallback
  const bucket = getOrCreateBucket(key);
  const oneMinuteAgo = now - MINUTE_MS;
  bucket.timestamps = bucket.timestamps.filter((t) => t > oneMinuteAgo);

  if (bucket.timestamps.length >= config.requestsPerMinute) {
    const oldestInWindow = bucket.timestamps[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(oldestInWindow + MINUTE_MS),
      tier,
    };
  }

  if (bucket.dailyCount >= config.requestsPerDay) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(bucket.dailyResetAt),
      tier,
    };
  }

  bucket.timestamps.push(now);
  bucket.dailyCount += 1;

  return {
    allowed: true,
    remaining: Math.min(
      config.requestsPerMinute - bucket.timestamps.length,
      config.requestsPerDay - bucket.dailyCount,
    ),
    resetAt: new Date(now + MINUTE_MS),
    tier,
  };
}

/**
 * Get current rate limit status without consuming a token.
 * Returns synchronous estimates from in-memory (accurate in dev); in Redis
 * mode this is best-effort because we don't query Upstash here for speed.
 */
export function getRateLimitStatus(
  workspaceId: string,
  tier: RateLimitTier = 'FREE',
): Omit<RateLimitResult, 'allowed'> & { minuteUsed: number; dailyUsed: number } {
  const config = TIER_LIMITS[tier];
  const key = `ai:${workspaceId}`;
  const bucket = getOrCreateBucket(key);
  const now = Date.now();
  const oneMinuteAgo = now - MINUTE_MS;

  const recentTimestamps = bucket.timestamps.filter((t) => t > oneMinuteAgo);

  return {
    remaining: Math.min(
      config.requestsPerMinute - recentTimestamps.length,
      config.requestsPerDay - bucket.dailyCount,
    ),
    resetAt: new Date(now + MINUTE_MS),
    tier,
    minuteUsed: recentTimestamps.length,
    dailyUsed: bucket.dailyCount,
  };
}

/**
 * Reset rate limits for a workspace (testing / admin override).
 */
export async function resetRateLimit(workspaceId: string): Promise<void> {
  const key = `ai:${workspaceId}`;
  store.delete(key);
  if (redis) {
    await redis.del(key);
  }
}

// ─── Generic sliding window ────────────────────────────────

/**
 * Generic sliding-window rate limiter — reusable across auth, AI, webhooks.
 * Consumes one token per call.
 *
 * @param key        - unique bucket key (namespace with prefix, e.g. "auth-email:foo@bar.com")
 * @param maxInWindow - max requests allowed in the window
 * @param windowMs   - sliding window length in ms
 */
export async function checkGenericRateLimit(
  key: string,
  maxInWindow: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (redis) {
    await redis.zremrangebyscore(key, 0, windowStart);
    const count = await redis.zcount(key, windowStart, '+inf');

    if (count >= maxInWindow) {
      const oldestInWindow = await redis.zrange<string[]>(
        key, windowStart, '+inf', { byScore: true, offset: 0, count: 1 },
      );
      const oldestScore = oldestInWindow?.[0]
        ? Number.parseInt(oldestInWindow[0].split('-')[0] ?? '0', 10)
        : now;
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(oldestScore + windowMs),
      };
    }

    await redis.zadd(key, { score: now, member: randomMember() });
    await redis.expire(key, Math.ceil(windowMs / 1000) + 60);

    return {
      allowed: true,
      remaining: maxInWindow - count - 1,
      resetAt: new Date(now + windowMs),
    };
  }

  // In-memory fallback
  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [], dailyCount: 0, dailyResetAt: getNextMidnightUTC() };
    store.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= maxInWindow) {
    const oldestInWindow = entry.timestamps[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(oldestInWindow + windowMs),
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxInWindow - entry.timestamps.length,
    resetAt: new Date(now + windowMs),
  };
}
