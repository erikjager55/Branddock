import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { buildCreativePipelineContext, buildConceptDrivenStrategy } from '@/lib/campaigns/strategy-chain';
import type { StrategicIntent, CreativeConcept, HumanInsight } from '@/lib/campaigns/strategy-blueprint.types';
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
  personaIds: z.array(z.string()).optional(),
  productIds: z.array(z.string()).optional(),
  competitorIds: z.array(z.string()).optional(),
  trendIds: z.array(z.string()).optional(),
  strategicIntent: z.string().optional(),
  approvedConcept: z.object({}).passthrough(),
  approvedInsight: z.object({}).passthrough(),
  debateContext: z.string().optional(),
});

/**
 * POST /api/campaigns/wizard/strategy/build-strategy
 * Builds the final concept-driven strategy from an approved concept and insight.
 * SSE stream with progress events + final result (strategy + architecture).
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

          const result = await buildConceptDrivenStrategy(
            ctx,
            body.approvedConcept as unknown as CreativeConcept,
            body.approvedInsight as unknown as HumanInsight,
            body.debateContext,
            (event) => sendEvent(event as Record<string, unknown>),
          );

          sendEvent({ type: 'complete', result });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('[build-strategy] Error:', message);
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
    console.error('[POST /api/campaigns/wizard/strategy/build-strategy]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
