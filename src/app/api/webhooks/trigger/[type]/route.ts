// =============================================================
// External trigger webhook (4.4)
//
// POST /api/webhooks/trigger/{type}
//   Authorization: Bearer <WEBHOOK_TRIGGER_SECRET>
//   body: { workspaceId?, payload?, scheduledAt?, idempotencyKey?, priority?, maxAttempts? }
//
// Creates an AgentJob that will be processed on the next cron run.
// Intended for external systems (n8n, Zapier, other services) that
// want to nudge the Brandclaw agent or run a specific task.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { AgentJobType } from '@prisma/client';
import { dispatchJob } from '@/lib/agents/jobs/dispatch';
import { checkGenericRateLimit } from '@/lib/ai/rate-limiter';

const triggerSchema = z.object({
  workspaceId: z.string().nullable().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  scheduledAt: z.string().datetime().optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
});

// Keep this in sync with the AgentJobType enum in prisma/schema.prisma.
const VALID_TYPES: ReadonlySet<AgentJobType> = new Set<AgentJobType>([
  'MEMORY_DECAY',
  'CAMPAIGN_SEND_FOLLOWUP',
  'TREND_SCAN_WORKSPACE',
  'AGENT_TASK',
  'HEARTBEAT',
]);

const TRIGGER_WINDOW_MS = 60_000;
const TRIGGER_MAX_PER_WINDOW = 30;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.WEBHOOK_TRIGGER_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

function normaliseType(raw: string): AgentJobType | null {
  const upper = raw.toUpperCase().replace(/-/g, '_') as AgentJobType;
  return VALID_TYPES.has(upper) ? upper : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const forwardedFor = request.headers.get('x-forwarded-for') ?? 'unknown';
  const clientIp = forwardedFor.split(',')[0]?.trim() ?? 'unknown';
  const rateKey = `webhook-trigger:${clientIp}`;
  const rate = await checkGenericRateLimit(rateKey, TRIGGER_MAX_PER_WINDOW, TRIGGER_WINDOW_MS);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rate.resetAt.getTime() - Date.now()) / 1000)),
          'X-RateLimit-Remaining': String(rate.remaining),
          'X-RateLimit-Reset': rate.resetAt.toISOString(),
        },
      },
    );
  }

  const { type: rawType } = await params;
  const type = normaliseType(rawType);
  if (!type) {
    return NextResponse.json(
      { error: `Unknown job type "${rawType}"`, validTypes: [...VALID_TYPES] },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = triggerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { workspaceId, payload, scheduledAt, idempotencyKey, priority, maxAttempts } = parsed.data;

  const dispatched = await dispatchJob({
    type,
    payload,
    workspaceId: workspaceId ?? null,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    idempotencyKey,
    priority,
    maxAttempts,
    triggeredBy: 'webhook',
  });

  return NextResponse.json(
    {
      jobId: dispatched.id,
      deduped: dispatched.deduped,
      type,
    },
    { status: dispatched.deduped ? 200 : 202 },
  );
}
