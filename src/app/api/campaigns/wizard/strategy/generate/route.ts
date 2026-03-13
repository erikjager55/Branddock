import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { generateCampaignBlueprint } from '@/lib/campaigns/strategy-chain';
import type { PipelineStep, GenerateBlueprintBody } from '@/lib/campaigns/strategy-blueprint.types';

// ---------------------------------------------------------------------------
// POST /api/campaigns/wizard/strategy/generate
// Wizard-mode: generates a blueprint before the campaign exists in the DB.
// Always returns SSE (the wizard always uses streaming progress).
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    // Parse request body
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

    // SSE stream for wizard progress
    let currentStep = 0;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(data: PipelineStep | { type: string; blueprint?: unknown; error?: string; failedStep?: number }) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }

        try {
          const blueprint = await generateCampaignBlueprint(
            workspaceId,
            'wizard', // placeholder ID — not used in wizard mode
            {
              personaIds: body.personaIds,
              strategicIntent: body.strategicIntent,
              wizardContext: body.wizardContext,
            },
            (step: PipelineStep) => {
              currentStep = step.step;
              sendEvent(step);
            },
          );

          // Send completion event (not saved to DB — wizard saves on campaign creation)
          sendEvent({ type: 'complete', blueprint });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('[wizard/strategy/generate] Pipeline error:', message);
          sendEvent({ type: 'error', error: message, failedStep: currentStep });
        } finally {
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
    console.error('[POST /api/campaigns/wizard/strategy/generate]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
