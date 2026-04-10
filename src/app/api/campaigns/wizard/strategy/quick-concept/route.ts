import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { buildCreativePipelineContext, generateQuickConcept } from '@/lib/campaigns/strategy-chain';
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
 * Fast path for creativeRange === 'single' in the Pipeline Config sliders.
 * Runs generateQuickConcept (single Gemini Flash call, ~30-60s) which
 * produces BOTH an insight and a creative concept in one shot, skipping
 * the full insight mining + creative leap phases.
 *
 * Returns { insight, concept } wrapped in the CreativeLeapResult shape
 * (concepts array + auto-selected index + selectedInsight) so the client's
 * existing concept-review flow can pick up the result without knowing about
 * the fast path.
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

          const { insight, concept } = await generateQuickConcept(
            ctx,
            (event) => sendEvent(event as Record<string, unknown>),
          );

          // Return in the same shape as generate-concepts so the client
          // can handle both paths uniformly in ConceptStep.
          sendEvent({
            type: 'complete',
            result: {
              insights: [insight],
              concepts: [concept],
              selectedInsightIndex: 0,
              selectedConceptIndex: 0,
              selectedInsight: insight,
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
