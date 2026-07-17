// =============================================================
// POST /api/v1/video-generate — publieke Brand-API: on-brand videoclip
// (Fase D2, ADR 2026-07-17). Non-streaming; de request wacht op de
// fal-provider (tot ~5 min). 'video-clip'-charge (20) in de service bij
// succes; usage-log metadata-only.
// =============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateVideoClip } from '@/lib/content/headless-video';
import { isPublicApiEnabled, requireApiKey } from '@/lib/api/public/auth';
import { logApiCall } from '@/lib/api/public/usage';

export const maxDuration = 300;

const bodySchema = z.object({
  deliverableId: z.string().optional(),
  contentType: z.string().optional(),
  title: z.string().max(120).optional(),
  campaignId: z.string().optional(),
  scriptText: z.string().min(1).max(5000),
  provider: z.string().min(1),
  duration: z.number().int().min(3).max(15).default(5),
  aspectRatio: z.string().default('9:16'),
  sourceImageUrl: z.string().url().optional(),
  motionPrompt: z.string().max(500).optional(),
  sceneId: z.enum(['hook', 'body', 'cta', 'full']).default('full'),
});

const ERROR_STATUS: Record<string, number> = {
  FAL_NOT_CONFIGURED: 503,
  UNKNOWN_PROVIDER: 400,
  DELIVERABLE_NOT_FOUND: 404,
  CREATE_FAILED: 400,
  LOCAL_IMAGE_URL: 400,
  INVALID_PARAMS: 400,
  GENERATION_FAILED: 502,
};

export async function POST(request: Request) {
  if (!isPublicApiEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const auth = await requireApiKey(request);
  if (!auth) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }

  const startedAt = Date.now();
  const result = await generateVideoClip({ workspaceId: auth.workspaceId, ...parsed.data });
  await logApiCall({
    workspaceId: auth.workspaceId,
    tool: 'generate_video',
    authVia: 'api_key',
    success: result.ok,
    latencyMs: Date.now() - startedAt,
    credits: result.ok ? 20 : 0,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: ERROR_STATUS[result.code] ?? 500 },
    );
  }
  return NextResponse.json({
    workspaceId: auth.workspaceId,
    deliverableId: result.deliverableId,
    videoUrl: result.videoUrl,
    provider: result.provider,
  });
}
