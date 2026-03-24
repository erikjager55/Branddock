import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { generateStrategyVariants } from '@/lib/campaigns/strategy-chain';
import type { PipelineStep, GenerateBlueprintBody } from '@/lib/campaigns/strategy-blueprint.types';

// Allow up to 5 minutes for Phase A (3 AI calls: strategy + dual architecture + persona validation)
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// POST /api/campaigns/wizard/strategy/generate-variants
// Phase A: Generates strategy + 3 architecture variants + persona validation.
// Returns SSE stream with progress events + final VariantPhaseResult.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    let body: GenerateBlueprintBody = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine — use defaults
    }

    if (!body.wizardContext?.campaignName) {
      return NextResponse.json(
        { error: 'wizardContext.campaignName is required' },
        { status: 400 },
      );
    }

    let currentStep = 0;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(data: PipelineStep | { type: string; result?: unknown; error?: string; failedStep?: number }) {
          try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch { /* stream closed */ }
        }

        // Send SSE keepalive comments every 15s to prevent connection drops
        const keepalive = setInterval(() => {
          try { controller.enqueue(encoder.encode(': keepalive\n\n')); } catch { /* stream closed */ }
        }, 15_000);

        try {
          const result = await generateStrategyVariants(
            {
              workspaceId,
              personaIds: body.personaIds,
              productIds: body.productIds,
              competitorIds: body.competitorIds,
              trendIds: body.trendIds,
              strategicIntent: body.strategicIntent,
              wizardContext: body.wizardContext!,
            },
            (event: import('@/features/campaigns/types/campaign-wizard.types').PipelineEvent) => {
              if ('step' in event) {
                currentStep = event.step;
              }
              sendEvent(event);
            },
          );

          sendEvent({ type: 'complete', result });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('[wizard/strategy/generate-variants] Pipeline error:', message);
          sendEvent({ type: 'error', error: message, failedStep: currentStep });
        } finally {
          clearInterval(keepalive);
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
    console.error('[POST /api/campaigns/wizard/strategy/generate-variants]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
