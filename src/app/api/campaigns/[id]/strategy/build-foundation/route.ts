import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { buildStrategyFoundation } from '@/lib/campaigns/strategy-chain';
import type { BuildFoundationBody, PipelineStep } from '@/lib/campaigns/strategy-blueprint.types';

export const maxDuration = 600;

/**
 * POST /api/campaigns/[id]/strategy/build-foundation
 * Phase 2: Build analytical strategy foundation (Claude Opus with deep thinking).
 * Runs full enrichment pipeline (Arena, Exa, Scholar, BCT, CASI, MINDSPACE).
 * SSE stream with progress + enrichment events.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    await params;

    const body: BuildFoundationBody = await request.json();
    if (!body.wizardContext?.campaignName) {
      return NextResponse.json({ error: 'wizardContext.campaignName is required' }, { status: 400 });
    }

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
              personaIds: body.personaIds,
              productIds: body.productIds,
              competitorIds: body.competitorIds,
              trendIds: body.trendIds,
              strategicIntent: body.strategicIntent,
              wizardContext: body.wizardContext,
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
    console.error('[POST /api/campaigns/:id/strategy/build-foundation]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
