import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { synthesizeStrategy } from '@/lib/campaigns/strategy-chain';
import type { PipelineStep, SynthesizeStrategyBody } from '@/lib/campaigns/strategy-blueprint.types';

// Allow up to 5 minutes for Phase B (1 AI call: strategy synthesis via Claude Opus)
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// POST /api/campaigns/wizard/strategy/synthesize
// Phase B: Synthesizes a definitive strategy from user-reviewed variants.
// Receives variant data + user feedback, returns SSE stream with progress + SynthesisPhaseResult.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    let body: SynthesizeStrategyBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!body.wizardContext?.campaignName) {
      return NextResponse.json(
        { error: 'wizardContext.campaignName is required' },
        { status: 400 },
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(data: PipelineStep | { type: string; result?: unknown; error?: string; failedStep?: number }) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }

        // Send SSE keepalive comments every 15s to prevent connection drops
        const keepalive = setInterval(() => {
          try { controller.enqueue(encoder.encode(': keepalive\n\n')); } catch { /* stream closed */ }
        }, 15_000);

        try {
          const result = await synthesizeStrategy(
            {
              variantFeedback: body.variantFeedback,
              strategyLayerA: body.strategyLayerA,
              strategyLayerB: body.strategyLayerB,
              variantA: body.variantA,
              variantB: body.variantB,
              personaValidation: body.personaValidation,
              variantAScore: body.variantAScore,
              variantBScore: body.variantBScore,
              wizardContext: body.wizardContext,
              strategicIntent: body.strategicIntent,
            },
            (step: PipelineStep) => {
              sendEvent(step);
            },
          );

          sendEvent({ type: 'complete', result });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('[wizard/strategy/synthesize] Pipeline error:', message);
          sendEvent({ type: 'error', error: message, failedStep: 4 });
        } finally {
          clearInterval(keepalive);
          controller.close();
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
    console.error('[POST /api/campaigns/wizard/strategy/synthesize]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
