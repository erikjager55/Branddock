import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { generateStrategyVariants, runMultiAgentDebate } from '@/lib/campaigns/strategy-chain';
import { getBrandContext } from '@/lib/ai/brand-context';
import { formatBrandContext } from '@/lib/ai/prompt-templates';
import { buildSelectedPersonasContext } from '@/lib/ai/persona-context';
import type { PipelineStep, GenerateBlueprintBody } from '@/lib/campaigns/strategy-blueprint.types';

// Allow up to 10 minutes for Phase A + multi-agent debate
export const maxDuration = 600;

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
        function sendEvent(data: PipelineStep | import('@/features/campaigns/types/campaign-wizard.types').AgentRoundEvent | { type: string; result?: unknown; error?: string; failedStep?: number; [key: string]: unknown }) {
          try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch { /* stream closed */ }
        }

        // Send SSE keepalive comments every 15s to prevent connection drops
        const keepalive = setInterval(() => {
          try { controller.enqueue(encoder.encode(': keepalive\n\n')); } catch { /* stream closed */ }
        }, 15_000);

        try {
          const phaseCtx = {
            workspaceId,
            personaIds: body.personaIds,
            productIds: body.productIds,
            competitorIds: body.competitorIds,
            trendIds: body.trendIds,
            strategicIntent: body.strategicIntent,
            wizardContext: body.wizardContext!,
          };

          const progressCallback = (event: import('@/features/campaigns/types/campaign-wizard.types').PipelineEvent) => {
            if ('step' in event) {
              currentStep = event.step;
            }
            sendEvent(event);
          };

          const result = await generateStrategyVariants(phaseCtx, progressCallback);

          // If multi-agent is enabled, run Critic → Defense → Persona Panel debate
          if (body.multiAgent && result.strategyLayerA && result.strategyLayerB) {
            try {
              const personaIds = body.personaIds ?? [];
              // Build context needed for debate rounds (reuses cached brand context)
              const [brandContextData, personaContext] = await Promise.all([
                getBrandContext(workspaceId),
                buildSelectedPersonasContext(personaIds, workspaceId),
              ]);
              const brandContext = formatBrandContext(brandContextData);

              // Build persona profiles for persona panel
              let personaProfiles: Array<{ id: string; name: string; profile: string }> = [];
              if (personaIds.length > 0) {
                const { prisma } = await import('@/lib/prisma');
                const personas = await prisma.persona.findMany({
                  where: { id: { in: personaIds }, workspaceId },
                  select: { id: true, name: true, age: true, gender: true, occupation: true, location: true, goals: true, frustrations: true, motivations: true, personalityType: true, coreValues: true, preferredChannels: true, buyingTriggers: true, decisionCriteria: true, tagline: true, bio: true },
                });
                personaProfiles = personas.map(p => ({ id: p.id, name: p.name, profile: JSON.stringify(p) }));
              }

              const debate = await runMultiAgentDebate(
                result.strategyLayerA, result.variantA,
                result.strategyLayerB, result.variantB,
                phaseCtx, brandContext, personaContext, personaProfiles,
                progressCallback,
              );

              sendEvent({ type: 'complete', result: { ...result, agentDebate: { enabled: true, ...debate, generationTimeMs: 0 } } });
            } catch (debateError) {
              // Graceful degradation: if debate fails, return original variants
              const debateMsg = debateError instanceof Error ? debateError.message : 'Unknown debate error';
              console.error('[wizard/strategy/generate-variants] Multi-agent debate failed, falling back:', debateMsg);
              sendEvent({ type: 'agent_round', round: 'critique', agent: 'critic', status: 'error', label: `Debate skipped: ${debateMsg}` });
              sendEvent({ type: 'complete', result });
            }
          } else {
            sendEvent({ type: 'complete', result });
          }
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
