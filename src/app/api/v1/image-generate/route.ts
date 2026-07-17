// =============================================================
// POST /api/v1/image-generate — publieke Brand-API: on-brand beeld-generatie
// ("merken zijn taal"-batch).
//
// Zelfde kern als de Media-Library-route (media/ai-images/generate) via de
// headless service: provider-routing (fal.ai / Imagen / DALL-E), brand-
// guidelines default áán, storage-upload + GeneratedImage-persist en
// post-hoc 'image'-charge (2 credits, in de service). Pre-flight 402 bij
// ontoereikend saldo (Gate B-patroon). Key-pad: de creator-attributie valt
// terug op de oudste actieve owner van de org (machine-toegang heeft geen
// eigen user). Hele oppervlak achter PUBLIC_API_ENABLED; metadata-only
// usage-log.
// =============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateBrandImage } from '@/lib/content/headless-image';
import { enforceCreditsForAction } from '@/lib/stripe/enforcement';
import { isPublicApiEnabled, requireApiKey } from '@/lib/api/public/auth';
import { logApiCall } from '@/lib/api/public/usage';

// Beeld-generatie + download + storage-upload binnen de request.
export const maxDuration = 120;

const bodySchema = z.object({
  prompt: z.string().min(1).max(1000),
  name: z.string().min(1).max(200).optional(),
  provider: z.string().min(1).optional(),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '3:4', '4:3']).optional(),
  size: z.enum(['1024x1024', '1792x1024', '1024x1792']).optional(),
  quality: z.enum(['standard', 'hd']).optional(),
  style: z.enum(['vivid', 'natural']).optional(),
  applyBrandGuidelines: z.boolean().optional(),
});

const ERROR_STATUS: Record<string, number> = {
  PROVIDER_NOT_CONFIGURED: 400,
  UNKNOWN_PROVIDER: 400,
  NO_CREATOR: 409,
  GENERATION_FAILED: 502,
};

const IMAGE_CREDITS = 2;

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

  // Gate B: pre-flight 402 bij ontoereikend saldo (zelfde patroon als de
  // Media-Library-route); de afboeking zelf zit post-hoc in de service.
  const blocked = await enforceCreditsForAction(auth.workspaceId, 'image', 1);
  if (blocked) return blocked;

  const startedAt = Date.now();
  try {
    const result = await generateBrandImage({ workspaceId: auth.workspaceId, ...parsed.data });

    await logApiCall({
      workspaceId: auth.workspaceId,
      tool: 'generate_image',
      authVia: 'api_key',
      success: result.ok,
      latencyMs: Date.now() - startedAt,
      credits: result.ok ? IMAGE_CREDITS : 0,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: ERROR_STATUS[result.code] ?? 500 },
      );
    }
    return NextResponse.json({ workspaceId: auth.workspaceId, image: result.image }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/v1/image-generate]', error);
    await logApiCall({
      workspaceId: auth.workspaceId,
      tool: 'generate_image',
      authVia: 'api_key',
      success: false,
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
