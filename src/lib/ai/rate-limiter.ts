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

// ─── Redis client (lazy init with failure tracking) ────────

let redis: Redis | null = null;
let redisFailCount = 0;
const MAX_REDIS_FAILURES = 5;

function getRedis(): Redis | null {
  if (redisFailCount >= MAX_REDIS_FAILURES) return null;
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

function markRedisFailure(): void {
  redisFailCount++;
  if (redisFailCount >= MAX_REDIS_FAILURES) {
    redis = null;
    console.warn(`[Rate limiter] ${MAX_REDIS_FAILURES} consecutive Redis failures. Falling back to in-memory.`);
  }
}

function markRedisSuccess(): void {
  redisFailCount = 0;
}

// ─── In-memory fallback ────────────────────────────────────

interface BucketEntry {
  timestamps: number[];
  dailyCount: number;
  dailyResetAt: number;
}

const memoryStore = new Map<string, BucketEntry>();
const MEMORY_STORE_MAX_SIZE = 10_000;

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
    // Evict oldest entry if store is too large
    if (memoryStore.size >= MEMORY_STORE_MAX_SIZE) {
      const firstKey = memoryStore.keys().next().value;
      if (firstKey) memoryStore.delete(firstKey);
    }

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

  return {
    allowed: true,
    remaining: Math.max(0, Math.min(minuteRemaining, dailyRemaining)),
    resetAt: new Date(now + 60_000),
    tier,
  };
}

// ─── Redis-backed rate limiting ────────────────────────────

/**
 * Read-then-write approach: check limits first, only increment if allowed.
 * Prevents denied requests from consuming daily quota.
 */
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
    // Step 1: Read current counts without incrementing
    const [minuteCount, dailyCount] = await Promise.all([
      client.get<number>(minuteKey),
      client.get<number>(dailyKey),
    ]);

    const currentMinute = minuteCount ?? 0;
    const currentDaily = dailyCount ?? 0;

    // Step 2: Check limits before consuming a token
    if (currentMinute >= config.requestsPerMinute) {
      const ttl = await client.ttl(minuteKey);
      markRedisSuccess();
      return { allowed: false, remaining: 0, resetAt: new Date(now + (ttl > 0 ? ttl * 1000 : 60_000)), tier };
    }

    if (currentDaily >= config.requestsPerDay) {
      const ttl = await client.ttl(dailyKey);
      markRedisSuccess();
      return { allowed: false, remaining: 0, resetAt: new Date(now + (ttl > 0 ? ttl * 1000 : 86_400_000)), tier };
    }

    // Step 3: Increment + set TTL in one pipeline
    const pipe = client.pipeline();
    pipe.incr(minuteKey);
    pipe.incr(dailyKey);

    // Set TTL only on the first request in a window (when key didn't exist)
    if (currentMinute === 0) {
      pipe.expire(minuteKey, 60);
    }
    if (currentDaily === 0) {
      const midnightUTC = getNextMidnightUTC();
      const secondsUntilMidnight = Math.ceil((midnightUTC - now) / 1000);
      pipe.expire(dailyKey, secondsUntilMidnight);
    }

    await pipe.exec();

    const minuteRemaining = config.requestsPerMinute - (currentMinute + 1);
    const dailyRemaining = config.requestsPerDay - (currentDaily + 1);

    markRedisSuccess();
    return {
      allowed: true,
      remaining: Math.max(0, Math.min(minuteRemaining, dailyRemaining)),
      resetAt: new Date(now + 60_000),
      tier,
    };
  } catch (err) {
    markRedisFailure();
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
    const key = `ai:${workspaceId}`;
    const bucket = getOrCreateBucket(key);
    const now = Date.now();
    const recentTimestamps = bucket.timestamps.filter((t) => t > now - 60_000);

    return {
      remaining: Math.max(0, Math.min(
        config.requestsPerMinute - recentTimestamps.length,
        config.requestsPerDay - bucket.dailyCount,
      )),
      resetAt: new Date(now + 60_000),
      tier,
      minuteUsed: recentTimestamps.length,
      dailyUsed: bucket.dailyCount,
    };
  }

  try {
    const [minuteCount, dailyCount] = await Promise.all([
      client.get<number>(`rl:min:${workspaceId}`),
      client.get<number>(`rl:day:${workspaceId}`),
    ]);

    const minuteUsed = minuteCount ?? 0;
    const dailyUsed = dailyCount ?? 0;

    markRedisSuccess();
    return {
      remaining: Math.max(0, Math.min(
        config.requestsPerMinute - minuteUsed,
        config.requestsPerDay - dailyUsed,
      )),
      resetAt: new Date(Date.now() + 60_000),
      tier,
      minuteUsed,
      dailyUsed,
    };
  } catch {
    markRedisFailure();
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
