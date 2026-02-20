// =============================================================
// AI Middleware (R0.8)
//
// Composable middleware helpers for AI API routes:
//  - withAiRateLimit  → rate limit check (per workspace, per tier)
//  - withBrandContext  → inject brand context into request
//  - withAi           → combined: auth + rate limit + brand context
//
// Usage in API route:
//   export async function POST(request: Request) {
//     const ctx = await withAi(request);
//     if (ctx instanceof Response) return ctx; // error response
//     // ctx.workspaceId, ctx.brandContext, ctx.rateLimitResult
//   }
// =============================================================

import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { aiConfig } from './config';
import { checkRateLimit, type RateLimitTier, type RateLimitResult } from './rate-limiter';
import { getBrandContext } from './brand-context';
import type { BrandContextBlock } from './prompt-templates';

// ─── Types ─────────────────────────────────────────────────

export interface AiRequestContext {
  workspaceId: string;
  brandContext: BrandContextBlock;
  rateLimitResult: RateLimitResult;
}

// ─── Rate limit middleware ──────────────────────────────────

/**
 * Check rate limits for the current workspace.
 * Returns a 429 Response if the limit is exceeded, or the RateLimitResult.
 */
export async function withAiRateLimit(
  workspaceId: string,
  tier: RateLimitTier = 'FREE',
): Promise<RateLimitResult | Response> {
  const result = checkRateLimit(workspaceId, tier);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        tier: result.tier,
        remaining: result.remaining,
        resetAt: result.resetAt.toISOString(),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(
            Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
          ),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': result.resetAt.toISOString(),
        },
      },
    );
  }

  return result;
}

// ─── Brand context middleware ───────────────────────────────

/**
 * Fetch brand context for the workspace.
 * Cached for 5 minutes; returns empty context on error.
 */
export async function withBrandContext(
  workspaceId: string,
): Promise<BrandContextBlock> {
  try {
    return await getBrandContext(workspaceId);
  } catch (err) {
    console.warn('[AI middleware] Failed to fetch brand context:', err);
    return {};
  }
}

// ─── Combined middleware ────────────────────────────────────

/**
 * All-in-one AI request middleware.
 * Handles: API key check → workspace resolution → rate limiting → brand context.
 *
 * Returns an AiRequestContext on success, or a Response (error) that should
 * be returned directly from the route handler.
 */
export async function withAi(
  _request: Request,
  options?: { skipBrandContext?: boolean; tier?: RateLimitTier },
): Promise<AiRequestContext | Response> {
  // 1. Check API key is configured
  if (!aiConfig.isConfigured) {
    return NextResponse.json(
      { error: 'AI features are not configured. Add OPENAI_API_KEY to .env.local.' },
      { status: 503 },
    );
  }

  // 2. Resolve workspace
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { error: 'Workspace not found. Please log in.' },
      { status: 401 },
    );
  }

  // 3. Rate limit
  const tier = options?.tier ?? 'FREE';
  const rateLimitResult = await withAiRateLimit(workspaceId, tier);
  if (rateLimitResult instanceof Response) return rateLimitResult;

  // 4. Brand context (optional)
  const brandContext = options?.skipBrandContext
    ? {}
    : await withBrandContext(workspaceId);

  return {
    workspaceId,
    brandContext,
    rateLimitResult,
  };
}
