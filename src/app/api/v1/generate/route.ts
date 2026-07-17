// =============================================================
// POST /api/v1/generate — publieke Brand-API: on-brand content genereren.
//
// Tweede-deur-principe: de aanroep maakt een échte Deliverable via de
// headless service (P3.0a) — zichtbaar in de content-library, gescoord
// door F-VAL, gemeterd in credits. contextSelection = de kennis-toggles.
// Credits: vlakke 'short'-afboeking per gegenereerd item (post-hoc,
// idempotent per deliverable) — kalibratie-punt zodra echte API-volumes
// er zijn (zie tasks/public-brand-api.md).
// =============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAndGenerateDeliverable } from '@/lib/content/headless-create';
import { chargeAfter } from '@/lib/billing/credits/meter-generation';
import { isPublicApiEnabled, requireApiKey } from '@/lib/api/public/auth';
import { logApiCall } from '@/lib/api/public/usage';

// Volledige canvas-pipeline binnen de request (zelfde budget als claw/confirm).
export const maxDuration = 300;

const bodySchema = z.object({
  contentType: z.string().min(1),
  title: z.string().max(120).optional(),
  campaignId: z.string().optional(),
  brief: z.object({
    objective: z.string().optional(),
    keyMessage: z.string().optional(),
    toneDirection: z.string().optional(),
    callToAction: z.string().optional(),
  }),
  contextSelection: z
    .object({
      personaIds: z.array(z.string()).optional(),
      productIds: z.array(z.string()).optional(),
      competitorIds: z.array(z.string()).optional(),
      knowledgeResourceIds: z.array(z.string()).optional(),
    })
    .optional(),
  generate: z.boolean().optional(),
});

const ERROR_STATUS: Record<string, number> = {
  BRIEF_INCOMPLETE: 400,
  CONTENT_TYPE_UNKNOWN: 400,
  CONTEXT_IDS_INVALID: 400,
  CAMPAIGN_NOT_FOUND: 404,
  CAMPAIGN_LOCKED: 409,
  SOURCE_NOT_FOUND: 404,
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
  const generateRequested = parsed.data.generate !== false;
  try {
    const result = await createAndGenerateDeliverable({
      workspaceId: auth.workspaceId,
      ...parsed.data,
    });

    if (!result.ok) {
      await logApiCall({
        workspaceId: auth.workspaceId,
        tool: 'generate_on_brand',
        authVia: 'api_key',
        success: false,
        latencyMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: ERROR_STATUS[result.code] ?? 400 },
      );
    }

    const generated = generateRequested && result.generationError === null;
    const credits = generated ? 5 : 0;
    if (generated) {
      await chargeAfter(
        {
          workspaceId: auth.workspaceId,
          action: 'short',
          feature: 'public-api-generate',
          idempotencyKey: `public-api:${result.deliverableId}`,
        },
        { count: 1 },
      ).catch(() => {});
    }
    await logApiCall({
      workspaceId: auth.workspaceId,
      tool: 'generate_on_brand',
      authVia: 'api_key',
      success: true,
      latencyMs: Date.now() - startedAt,
      credits,
    });

    return NextResponse.json({
      workspaceId: auth.workspaceId,
      deliverableId: result.deliverableId,
      campaignId: result.campaignId,
      title: result.title,
      generated,
      fidelityScore: result.fidelityScore,
      // De gegenereerde tekst zelf ("merken zijn taal"-batch) — geen tweede
      // roundtrip naar /api/v1/deliverable nodig voor het happy path.
      contentText: result.contentText,
      generationError: result.generationError,
    });
  } catch (error) {
    console.error('[POST /api/v1/generate]', error);
    await logApiCall({
      workspaceId: auth.workspaceId,
      tool: 'generate_on_brand',
      authVia: 'api_key',
      success: false,
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
