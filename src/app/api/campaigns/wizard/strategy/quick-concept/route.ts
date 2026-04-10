import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { buildCreativePipelineContext, generateQuickConcept, buildConceptDrivenStrategy } from '@/lib/campaigns/strategy-chain';
import type { StrategicIntent } from '@/lib/campaigns/strategy-blueprint.types';
import { z } from 'zod';

export const maxDuration = 120;

const pipelineConfigSchema = z.object({
  strategyDepth: z.enum(['basic', 'grounded', 'research-backed']),
  creativeRange: z.enum(['single', 'multi-variant', 'critiqued']),
  modelRigor: z.enum(['fast', 'balanced', 'deliberate']),
}).optional();

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
  pipelineConfig: pipelineConfigSchema,
});

/**
 * POST /api/campaigns/wizard/strategy/quick-concept
 *
 * Atomic fast path for creativeRange === 'single'. Runs TWO things back-to-back
 * in a single SSE call so the client sees one phase instead of three:
 *
 *   1. generateQuickConcept  — Gemini Flash, ~30-60s
 *      Produces both an insight and a creative concept in one shot.
 *
 *   2. buildConceptDrivenStrategy — rigor-scoped model, ~30-90s (Flash tier)
 *      Builds the full strategy + architecture on top of that concept so
 *      downstream elaborate/content phases have something to work with.
 *
 * Returns the combined result so the ConceptStep client can land directly
 * on review_concepts with the pre-built strategy in store — no separate
 * "Strategy Build" spinner. Users see ONE atomic concept-generation phase.
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
        }, 15_000);

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
            pipelineConfig: body.pipelineConfig,
          });

          // Phase 1: Generate the insight + concept in one Flash call.
          const { insight, concept } = await generateQuickConcept(
            ctx,
            (event) => sendEvent(event as Record<string, unknown>),
          );

          // Phase 2: Build the full strategy + architecture on top of the
          // concept. Runs with the rigor tier chosen by the user — Fast
          // means Flash here too (~30-60s). The client consumes this as
          // part of the SAME "generating_concepts" phase so there's no
          // intermediate UI spinner.
          const { strategy, architecture } = await buildConceptDrivenStrategy(
            ctx,
            concept,
            insight,
            undefined, // no debate context in Single mode
            (event) => sendEvent(event as Record<string, unknown>),
          );

          sendEvent({
            type: 'complete',
            result: {
              insights: [insight],
              concepts: [concept],
              selectedInsightIndex: 0,
              selectedConceptIndex: 0,
              selectedInsight: insight,
              strategy,
              architecture,
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('[quick-concept] Error:', message);
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
    console.error('[POST /api/campaigns/wizard/strategy/quick-concept]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
