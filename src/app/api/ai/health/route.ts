// =============================================================
// GET /api/ai/health
//
// Health check endpoint for AI configuration.
// Does NOT make an API call to OpenAI — just checks config.
//
// Response: { status, model, hasApiKey, rateLimiter }
// =============================================================

import { NextResponse } from 'next/server';
import { aiConfig } from '@/lib/ai/config';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { getRateLimitStatus } from '@/lib/ai/rate-limiter';

export async function GET() {
  const workspaceId = await resolveWorkspaceId();

  const rateLimitStatus = workspaceId
    ? getRateLimitStatus(workspaceId, 'FREE')
    : null;

  return NextResponse.json({
    status: 'ok',
    model: aiConfig.model,
    fallbackModel: aiConfig.fallbackModel,
    hasApiKey: aiConfig.isConfigured,
    hasAnthropicKey: !!aiConfig.anthropicApiKey,
    rateLimit: rateLimitStatus
      ? {
          tier: rateLimitStatus.tier,
          remaining: rateLimitStatus.remaining,
          minuteUsed: rateLimitStatus.minuteUsed,
          dailyUsed: rateLimitStatus.dailyUsed,
          resetAt: rateLimitStatus.resetAt.toISOString(),
        }
      : null,
  });
}
