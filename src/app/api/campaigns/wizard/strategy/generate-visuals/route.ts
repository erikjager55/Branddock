import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { buildCreativePipelineContext, generateConceptVisuals } from '@/lib/campaigns/strategy-chain';
import type { StrategicIntent, CreativeConcept } from '@/lib/campaigns/strategy-blueprint.types';
import { z } from 'zod';

export const maxDuration = 600;

const requestSchema = z.object({
  workspaceId: z.string().optional(),
  wizardContext: z.object({
    campaignName: z.string(),
    campaignDescription: z.string().optional(),
    campaignGoalType: z.string().optional(),
    briefing: z.object({}).passthrough().optional(),
    useExternalEnrichment: z.boolean().optional(),
  }).passthrough(),
  selectedConcept: z.object({}).passthrough(),
  personaIds: z.array(z.string()).optional(),
  productIds: z.array(z.string()).optional(),
  competitorIds: z.array(z.string()).optional(),
  trendIds: z.array(z.string()).optional(),
  strategicIntent: z.string().optional(),
});

/**
 * POST /api/campaigns/wizard/strategy/generate-visuals
 * Generates 3 campaign mockup visuals (hero/square/story) for a selected creative concept.
 * SSE stream with progress events + final visuals result.
 */
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const body = requestSchema.parse(await request.json());

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const heartbeat = setInterval(() => {
          try { controller.enqueue(encoder.encode(': heartbeat\n\n')); } catch { /* stream closed */ }
        }, 30_000);

        function sendEvent(data: Record<string, unknown>) {
          try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch { /* stream closed */ }
        }

        try {
          const ctx = await buildCreativePipelineContext(workspaceId, {
            personaIds: body.personaIds,
            productIds: body.productIds,
            competitorIds: body.competitorIds,
            trendIds: body.trendIds,
            strategicIntent: body.strategicIntent as StrategicIntent | undefined,
            wizardContext: body.wizardContext,
          });

          const result = await generateConceptVisuals(
            ctx,
            body.selectedConcept as unknown as CreativeConcept,
            (event) => sendEvent(event as Record<string, unknown>),
          );

          sendEvent({ type: 'complete', result });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('[generate-visuals] Error:', message);
          sendEvent({ type: 'error', error: message });
        } finally {
          clearInterval(heartbeat);
          try { controller.close(); } catch { /* already closed */ }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[POST /api/campaigns/wizard/strategy/generate-visuals]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
