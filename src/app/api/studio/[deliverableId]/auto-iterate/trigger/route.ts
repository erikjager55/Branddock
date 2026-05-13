// =============================================================
// POST /api/studio/[deliverableId]/auto-iterate/trigger
//
// User-triggered auto-iterate flow. Wordt aangeroepen door
// "Verbeter automatisch" CTA in canvas FidelityScoreBar wanneer
// composite-score onder threshold zit. Streams SSE events voor
// live progress feedback.
//
// Flow:
//   1. Resolve deliverable + workspace + latest fidelity outcome
//   2. Build composition-input voor F-VAL rescoring
//   3. Stream auto_iterate_* SSE events tijdens iteraties
//   4. Persist snapshot naar Deliverable.settings.autoIterate
//
// Verschil met automatisch run in canvas-orchestrator (Step 2.8): die
// werd uitgefaseerd 2026-05-13 omdat user-control + verklaarbaarheid
// belangrijker zijn dan automatische optimalisatie.
// =============================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { assembleCanvasContext } from '@/lib/ai/canvas-context';
import { runFidelityScoring } from '@/lib/brand-fidelity/fidelity-runner';
import { runAutoIterateIntegration } from '@/lib/ai/auto-iterate-integration';
import type { AutoIterateEvent } from '@/lib/ai/auto-iterate';

interface RouteParams {
  params: Promise<{ deliverableId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return new Response(JSON.stringify({ error: 'No workspace found' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { deliverableId } = await params;

  const deliverable = await prisma.deliverable.findFirst({
    where: { id: deliverableId, campaign: { workspaceId } },
    select: { id: true, contentType: true, campaignId: true },
  });
  if (!deliverable) {
    return new Response(JSON.stringify({ error: 'Deliverable not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Stream SSE events naar client. Build context + initial F-VAL score
  // op huidige variant-content om auto-iterate te kunnen kicken.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: AutoIterateEvent) => {
        const payload = `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };
      const sendError = (message: string) => {
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ message })}\n\n`),
        );
      };

      try {
        // Load context-stack voor brand + voiceguide + threshold lookup
        const stack = await assembleCanvasContext(deliverableId, workspaceId);
        if (!stack.brand?.brandName) {
          sendError('Geen brand-context beschikbaar voor auto-iteratie');
          controller.close();
          return;
        }

        // Haal current variant-0 content op (de "primary" variant)
        const components = await prisma.deliverableComponent.findMany({
          where: { deliverableId, variantIndex: 0 },
          orderBy: { order: 'asc' },
          select: { generatedContent: true, componentType: true },
        });
        const blobText = components
          .map((c) => c.generatedContent ?? '')
          .filter((s) => s.length > 0)
          .join('\n\n');
        if (blobText.split(/\s+/).filter(Boolean).length < 50) {
          sendError('Niet genoeg content om te verbeteren — genereer eerst content');
          controller.close();
          return;
        }

        // Run initial F-VAL om huidige score + compositionInput te krijgen
        const initialOutcome = await runFidelityScoring({
          workspaceId,
          deliverableId,
          contentTypeId: stack.deliverableTypeId,
          contentText: blobText,
          stack,
          generatorProvider: 'anthropic',
        });
        if (!initialOutcome) {
          sendError('Score-berekening faalde — probeer opnieuw');
          controller.close();
          return;
        }

        // Delegate naar integration-module die regenerate + rescore + persistence regelt
        const iterateGen = runAutoIterateIntegration({
          workspaceId,
          deliverableId,
          contentTypeId: stack.deliverableTypeId,
          compositionInput: initialOutcome.compositionInput,
          initialResult: initialOutcome.result,
          initialText: blobText,
          enabled: true,
          stack,
          textModelProvider: 'anthropic',
        });

        let outcome: import('@/lib/ai/auto-iterate').AutoIterateResult | null = null;
        while (true) {
          const { value, done } = await iterateGen.next();
          if (done) {
            outcome = value;
            break;
          }
          sendEvent(value);
        }

        // Persist snapshot
        if (outcome && outcome.attemptsExecuted > 0) {
          try {
            const existing = await prisma.deliverable.findUnique({
              where: { id: deliverableId },
              select: { settings: true },
            });
            const currentSettings = (existing?.settings as Record<string, unknown> | null) ?? {};
            await prisma.deliverable.update({
              where: { id: deliverableId },
              data: {
                settings: {
                  ...currentSettings,
                  autoIterate: {
                    attemptsExecuted: outcome.attemptsExecuted,
                    finalScore: outcome.finalScore,
                    thresholdMet: outcome.thresholdMet,
                    stopReason: outcome.stopReason,
                    finalText: outcome.finalText,
                    iterations: outcome.iterations,
                    iteratedAt: new Date().toISOString(),
                  },
                },
              },
            });
          } catch (persistErr) {
            console.warn(
              '[auto-iterate/trigger] snapshot persist failed:',
              (persistErr as Error).message,
            );
          }
        }

        controller.close();
      } catch (err) {
        console.error('[auto-iterate/trigger] error:', err);
        sendError(err instanceof Error ? err.message : 'Unknown error');
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
