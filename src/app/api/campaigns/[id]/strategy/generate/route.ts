import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { requireUnlocked } from '@/lib/lock-guard';
import { generateCampaignBlueprint, createDeliverablesFromBlueprint } from '@/lib/campaigns/strategy-chain';

// Allow up to 10 minutes for the full 6-step pipeline
export const maxDuration = 600;
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import type { PipelineStep, GenerateBlueprintBody } from '@/lib/campaigns/strategy-blueprint.types';

// ---------------------------------------------------------------------------
// Shared: save blueprint to campaign + invalidate caches
// ---------------------------------------------------------------------------
async function saveBlueprintToCampaign(
  id: string,
  workspaceId: string,
  blueprint: import('@/lib/campaigns/strategy-blueprint.types').CampaignBlueprint,
) {
  await prisma.campaign.update({
    where: { id },
    data: {
      strategy: JSON.parse(JSON.stringify(blueprint)),
      strategyConfidence: blueprint.confidence,
      strategicApproach: blueprint.strategy.positioningStatement,
      keyMessages: [
        blueprint.strategy.messagingHierarchy.brandMessage,
        blueprint.strategy.messagingHierarchy.campaignMessage,
        ...blueprint.strategy.messagingHierarchy.proofPoints.slice(0, 3),
      ],
      targetAudienceInsights: blueprint.personaValidation.length > 0
        ? blueprint.personaValidation.map(p => `${p.personaName}: ${p.feedback}`).join('\n')
        : blueprint.strategy.jtbdFraming.jobStatement,
      recommendedChannels: blueprint.channelPlan.channels.map(c => c.name),
      strategyGeneratedAt: new Date(),
    },
  });

  // Auto-populate deliverables from the asset plan
  if (blueprint.assetPlan?.deliverables?.length > 0) {
    await createDeliverablesFromBlueprint(id, blueprint.assetPlan.deliverables);
  }

  invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
  invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));
}

// ---------------------------------------------------------------------------
// POST /api/campaigns/[id]/strategy/generate
// Supports two modes:
//   - Accept: text/event-stream → SSE with real-time progress (used by wizard)
//   - Accept: application/json  → synchronous JSON response (used by detail page)
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const { id } = await params;

    const lockResponse = await requireUnlocked('campaign', id);
    if (lockResponse) return lockResponse;

    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
    });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Parse request body
    let body: GenerateBlueprintBody = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine — use defaults
    }

    const accept = request.headers.get('accept') || '';
    const wantsSSE = accept.includes('text/event-stream');

    // ── JSON mode: run pipeline synchronously, return result ──
    if (!wantsSSE) {
      const blueprint = await generateCampaignBlueprint(
        workspaceId,
        id,
        {
          personaIds: body.personaIds,
          strategicIntent: body.strategicIntent,
        },
      );

      await saveBlueprintToCampaign(id, workspaceId, blueprint);
      return NextResponse.json(blueprint);
    }

    // ── SSE mode: stream progress events ──
    let currentStep = 0;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const heartbeat = setInterval(() => {
          try { controller.enqueue(encoder.encode(': heartbeat\n\n')); } catch { /* stream closed */ }
        }, 15_000);

        function sendEvent(data: PipelineStep | { type: string; blueprint?: unknown; error?: string; failedStep?: number }) {
          try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch { /* stream closed */ }
        }

        try {
          const blueprint = await generateCampaignBlueprint(
            workspaceId,
            id,
            {
              personaIds: body.personaIds,
              strategicIntent: body.strategicIntent,
            },
            (event: import('@/features/campaigns/types/campaign-wizard.types').PipelineEvent) => {
              if ('step' in event) {
                currentStep = event.step;
              }
              sendEvent(event);
            },
          );

          await saveBlueprintToCampaign(id, workspaceId, blueprint);

          // Send completion event
          sendEvent({ type: 'complete', blueprint });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('[strategy/generate] Pipeline error:', message);
          sendEvent({ type: 'error', error: message, failedStep: currentStep });
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
    console.error('[POST /api/campaigns/:id/strategy/generate]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
