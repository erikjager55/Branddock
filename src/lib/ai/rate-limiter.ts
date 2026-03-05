// =============================================================
// Rate Limiter (R0.8 → Fase 2.1)
//
// Upstash Redis-backed rate limiting with 3 tiers:
//  - FREE:    20 req/min,  200 req/day
//  - PRO:     60 req/min,  1000 req/day
//  - AGENCY:  120 req/min, 5000 req/day
//
// Falls back to in-memory if UPSTASH_REDIS_REST_URL is not set.
// =============================================================

import { Redis } from '@upstash/redis';

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

// ─── Redis client (lazy init) ──────────────────────────────

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

// ─── In-memory fallback ────────────────────────────────────

interface BucketEntry {
  timestamps: number[];
  dailyCount: number;
  dailyResetAt: number;
}

const memoryStore = new Map<string, BucketEntry>();

function getNextMidnightUTC(): number {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0,
  )).getTime();
}

function getOrCreateBucket(key: string): BucketEntry {
  let entry = memoryStore.get(key);
  const now = Date.now();

  if (!entry || now >= entry.dailyResetAt) {
    entry = { timestamps: [], dailyCount: 0, dailyResetAt: getNextMidnightUTC() };
    memoryStore.set(key, entry);
  }

  return entry;
}

function checkRateLimitMemory(workspaceId: string, tier: RateLimitTier): RateLimitResult {
  const config = TIER_LIMITS[tier];
  const key = `ai:${workspaceId}`;
  const bucket = getOrCreateBucket(key);
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;

  bucket.timestamps = bucket.timestamps.filter((t) => t > oneMinuteAgo);

  if (bucket.timestamps.length >= config.requestsPerMinute) {
    const oldestInWindow = bucket.timestamps[0] ?? now;
    return { allowed: false, remaining: 0, resetAt: new Date(oldestInWindow + 60_000), tier };
  }

  if (bucket.dailyCount >= config.requestsPerDay) {
    return { allowed: false, remaining: 0, resetAt: new Date(bucket.dailyResetAt), tier };
  }

  bucket.timestamps.push(now);
  bucket.dailyCount += 1;

  const minuteRemaining = config.requestsPerMinute - bucket.timestamps.length;
  const dailyRemaining = config.requestsPerDay - bucket.dailyCount;

  return { allowed: true, remaining: Math.min(minuteRemaining, dailyRemaining), resetAt: new Date(now + 60_000), tier };
}

// ─── Redis-backed rate limiting ────────────────────────────

async function checkRateLimitRedis(
  client: Redis,
  workspaceId: string,
  tier: RateLimitTier,
): Promise<RateLimitResult> {
  const config = TIER_LIMITS[tier];
  const minuteKey = `rl:min:${workspaceId}`;
  const dailyKey = `rl:day:${workspaceId}`;
  const now = Date.now();

  try {
    // Use pipeline for atomic operations
    const pipe = client.pipeline();
    pipe.incr(minuteKey);
    pipe.ttl(minuteKey);
    pipe.incr(dailyKey);
    pipe.ttl(dailyKey);

    const results = await pipe.exec();
    const minuteCount = results[0] as number;
    const minuteTtl = results[1] as number;
    const dailyCount = results[2] as number;
    const dailyTtl = results[3] as number;

    // Set TTL on first request in window
    if (minuteTtl === -1) {
      await client.expire(minuteKey, 60);
    }
    if (dailyTtl === -1) {
      // Calculate seconds until midnight UTC
      const midnightUTC = getNextMidnightUTC();
      const secondsUntilMidnight = Math.ceil((midnightUTC - now) / 1000);
      await client.expire(dailyKey, secondsUntilMidnight);
    }

    // Check per-minute limit
    if (minuteCount > config.requestsPerMinute) {
      const resetAt = new Date(now + (minuteTtl > 0 ? minuteTtl * 1000 : 60_000));
      return { allowed: false, remaining: 0, resetAt, tier };
    }

    // Check daily limit
    if (dailyCount > config.requestsPerDay) {
      const resetAt = new Date(now + (dailyTtl > 0 ? dailyTtl * 1000 : 86_400_000));
      return { allowed: false, remaining: 0, resetAt, tier };
    }

    const minuteRemaining = config.requestsPerMinute - minuteCount;
    const dailyRemaining = config.requestsPerDay - dailyCount;

    return {
      allowed: true,
      remaining: Math.min(minuteRemaining, dailyRemaining),
      resetAt: new Date(now + 60_000),
      tier,
    };
  } catch (err) {
    console.warn('[Rate limiter] Redis error, falling back to in-memory:', err);
    return checkRateLimitMemory(workspaceId, tier);
  }
}

// ─── Public API ────────────────────────────────────────────

/**
 * Check whether a request is allowed and consume a token.
 * Uses Upstash Redis if configured, otherwise falls back to in-memory.
 */
export async function checkRateLimit(
  workspaceId: string,
  tier: RateLimitTier = 'FREE',
): Promise<RateLimitResult> {
  const client = getRedis();

  if (!client) {
    return checkRateLimitMemory(workspaceId, tier);
  }

  return checkRateLimitRedis(client, workspaceId, tier);
}

/**
 * Get current rate limit status without consuming a token.
 */
export async function getRateLimitStatus(
  workspaceId: string,
  tier: RateLimitTier = 'FREE',
): Promise<Omit<RateLimitResult, 'allowed'> & { minuteUsed: number; dailyUsed: number }> {
  const config = TIER_LIMITS[tier];
  const client = getRedis();

  if (!client) {
    // In-memory path
    const key = `ai:${workspaceId}`;
    const bucket = getOrCreateBucket(key);
    const now = Date.now();
    const recentTimestamps = bucket.timestamps.filter((t) => t > now - 60_000);

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

  try {
    const minuteKey = `rl:min:${workspaceId}`;
    const dailyKey = `rl:day:${workspaceId}`;

    const [minuteCount, dailyCount] = await Promise.all([
      client.get<number>(minuteKey),
      client.get<number>(dailyKey),
    ]);

    const minuteUsed = minuteCount ?? 0;
    const dailyUsed = dailyCount ?? 0;

    return {
      remaining: Math.min(
        config.requestsPerMinute - minuteUsed,
        config.requestsPerDay - dailyUsed,
      ),
      resetAt: new Date(Date.now() + 60_000),
      tier,
      minuteUsed,
      dailyUsed,
    };
  } catch {
    return {
      remaining: config.requestsPerMinute,
      resetAt: new Date(Date.now() + 60_000),
      tier,
      minuteUsed: 0,
      dailyUsed: 0,
    };
  }
}

/**
 * Reset rate limits for a workspace (useful for testing).
 */
export async function resetRateLimit(workspaceId: string): Promise<void> {
  memoryStore.delete(`ai:${workspaceId}`);

  const client = getRedis();
  if (client) {
    try {
      await Promise.all([
        client.del(`rl:min:${workspaceId}`),
        client.del(`rl:day:${workspaceId}`),
      ]);
    } catch {
      // Ignore Redis errors during reset
    }
  }
}
