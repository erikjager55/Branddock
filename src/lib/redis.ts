/**
 * Upstash Redis client singleton.
 * Returns null when env vars are missing (local dev fallback).
 */
import { Redis } from '@upstash/redis';

function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

/** Global singleton — null in dev mode when env vars are not set */
const globalForRedis = globalThis as unknown as { __redis?: Redis | null };
export const redis: Redis | null = globalForRedis.__redis ??= createRedisClient();
