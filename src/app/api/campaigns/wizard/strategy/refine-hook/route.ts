import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { refineSelectedHook } from '@/lib/campaigns/strategy-chain';
import type { RefineHookBody, PipelineStep } from '@/lib/campaigns/strategy-blueprint.types';

export const maxDuration = 600;

/**
 * POST /api/campaigns/wizard/strategy/refine-hook
 * Phase 6: Refine the user-selected hook into a production-ready proposal.
 * Uses Claude Opus with deep thinking to elevate the hook.
 * SSE stream with progress events.
 */
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const body: RefineHookBody = await request.json();
    if (!body.wizardContext?.campaignName) {
      return NextResponse.json({ error: 'wizardContext.campaignName is required' }, { status: 400 });
    }
    if (!body.selectedHook) {
      return NextResponse.json({ error: 'selectedHook is required' }, { status: 400 });
    }
    if (!body.foundation) {
      return NextResponse.json({ error: 'foundation is required' }, { status: 400 });
    }
    if (!body.personaValidation) {
      return NextResponse.json({ error: 'personaValidation is required' }, { status: 400 });
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
          const result = await refineSelectedHook(
            {
              workspaceId,
              personaIds: body.personaIds,
              productIds: body.productIds,
              competitorIds: body.competitorIds,
              trendIds: body.trendIds,
              strategicIntent: body.strategicIntent,
              wizardContext: body.wizardContext,
              selectedHook: body.selectedHook,
              foundation: body.foundation,
              personaValidation: body.personaValidation,
              hookFeedback: body.hookFeedback,
            },
            (event) => sendEvent(event),
          );

          sendEvent({ type: 'complete', result });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('[refine-hook] Error:', message);
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
    console.error('[POST /api/campaigns/wizard/strategy/refine-hook]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
