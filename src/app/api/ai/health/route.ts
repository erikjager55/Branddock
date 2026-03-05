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

  // Require authentication — don't expose config details to unauthenticated users
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitStatus = await getRateLimitStatus(workspaceId, 'FREE');

  return NextResponse.json({
    status: 'ok',
    aiEnabled: aiConfig.isConfigured,
    rateLimit: {
      tier: rateLimitStatus.tier,
      remaining: rateLimitStatus.remaining,
      minuteUsed: rateLimitStatus.minuteUsed,
      dailyUsed: rateLimitStatus.dailyUsed,
      resetAt: rateLimitStatus.resetAt.toISOString(),
    },
  });
}
