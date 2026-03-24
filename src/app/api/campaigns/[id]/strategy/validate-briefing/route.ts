import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { validateBriefing } from '@/lib/campaigns/strategy-chain';
import type { ValidateBriefingBody, PipelineStep } from '@/lib/campaigns/strategy-blueprint.types';

export const maxDuration = 120;

/**
 * POST /api/campaigns/[id]/strategy/validate-briefing
 * Phase 1: Evaluate briefing completeness (Gemini Flash, fast).
 * SSE stream with progress events + completion/error.
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

    await params; // validate route param exists

    const body: ValidateBriefingBody = await request.json();
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
          const result = await validateBriefing(
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
          console.error('[validate-briefing] Error:', message);
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
    console.error('[POST /api/campaigns/:id/strategy/validate-briefing]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
