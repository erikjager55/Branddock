import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { withAiRateLimit } from '@/lib/ai/middleware';
import { parseJsonBody } from '@/lib/api/parse-json-body';
import { buildFoundationBodySchema } from '@/lib/campaigns/strategy-request-schemas';
import { buildStrategyFoundation } from '@/lib/campaigns/strategy-chain';
import type { BuildFoundationBody, PipelineStep } from '@/lib/campaigns/strategy-blueprint.types';

export const maxDuration = 600;

/**
 * POST /api/campaigns/wizard/strategy/build-foundation
 * Phase 2: Build analytical strategy foundation (Claude Opus with deep thinking).
 * Runs full enrichment pipeline (Arena, Exa, Scholar, BCT, CASI, MINDSPACE).
 * SSE stream with progress + enrichment events.
 */
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    // L8 Zod-sweep (audit 2026-06-26, batch 3): wizardContext/pipelineConfig
    // gingen als vrije JSON de AI-pipeline in met alleen een campaignName-check.
    const parsed = await parseJsonBody(request, buildFoundationBodySchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as unknown as BuildFoundationBody;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const heartbeat = setInterval(() => {
          try { controller.enqueue(encoder.encode(': heartbeat\n\n')); } catch { /* stream closed */ }
        }, 15_000);

        function sendEvent(data: PipelineStep | { type: string; result?: unknown; error?: string }) {
          try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch { /* stream closed */ }
        }

        try {
          const result = await buildStrategyFoundation(
            {
              workspaceId,
              campaignId: body.campaignId,
              personaIds: body.personaIds,
              productIds: body.productIds,
              competitorIds: body.competitorIds,
              trendIds: body.trendIds,
              strategicIntent: body.strategicIntent,
              wizardContext: body.wizardContext,
              pipelineConfig: body.pipelineConfig,
            },
            (event) => sendEvent(event),
          );

          sendEvent({ type: 'complete', result });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('[build-foundation] Error:', message);
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
    console.error('[POST /api/campaigns/wizard/strategy/build-foundation]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
