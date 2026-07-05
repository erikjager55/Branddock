import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveDeliverableWorkspaceId } from '@/lib/deliverable/deliverable-access';
import { withAiRateLimit } from '@/lib/ai/middleware';
import { prisma } from '@/lib/prisma';
import { orchestrateContentGeneration } from '@/lib/ai/canvas-orchestrator';
import { buildAiErrorEvent } from '@/lib/ai/error-handler';
import { serializeContextForPrompt } from '@/lib/ai/context/fetcher';
import { isPuckRenderable } from '@/lib/landing-pages/webpage-types';
import { resolveTargetProfile, SHIPPED_CONTENT_LANGUAGES } from '@/lib/content-locale/default-profile';

// Allow up to 5 minutes for full generation pipeline (text + images)
export const maxDuration = 300;

const contextItemSchema = z.object({
  sourceType: z.string().max(100),
  sourceId: z.string().max(100),
  note: z.string().max(500).optional(),
  priority: z.enum(['primary', 'reference']).optional(),
});

const seoInputSchema = z.object({
  primaryKeyword: z.string().min(1).max(200),
  funnelStage: z.enum(['awareness', 'consideration', 'decision']),
  competitorUrls: z.array(z.string().url().max(500)).max(5).optional(),
  secondaryKeywordHints: z.array(z.string().max(200)).max(20).optional(),
  conversionGoal: z.string().max(200).optional(),
  trafficSource: z.string().max(200).optional(),
});

const orchestrateBodySchema = z.object({
  instruction: z.string().max(2000).optional(),
  regenerateGroup: z.string().max(100).optional(),
  userFeedback: z.string().max(5000).optional(),
  additionalContextItems: z.array(contextItemSchema).max(50).optional(),
  mediumConfig: z.record(z.string(), z.unknown()).optional(),
  seoInput: seoInputSchema.optional(),
  contentTypeInputs: z.record(z.string(), z.union([z.string(), z.array(z.string()), z.number(), z.boolean()])).optional(),
  targetLanguage: z.enum(SHIPPED_CONTENT_LANGUAGES).optional(),
});

// ---------------------------------------------------------------------------
// POST /api/studio/[deliverableId]/orchestrate
// Streams SSE events for multi-model content generation pipeline.
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    // Resource-based: workspace van het deliverable i.p.v. cookie-gelijkheid
    // (zombie-tab fix — docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md).
    const workspaceId = await resolveDeliverableWorkspaceId((await params).deliverableId);
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    const { deliverableId } = await params;

    // Verify deliverable ownership
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: {
        campaign: {
          select: { workspaceId: true },
        },
      },
    });

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    if (!deliverable.campaign || deliverable.campaign.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // W1 dubbelpad-gate (plan website-page-types §1): de 5 PUCK_WEBPAGE_TYPES
    // genereren via generate-structured-variant (Step 2 LandingPageGenerateBlock).
    // Deze legacy pipeline draaide er een tweede, ongebruikte generatie naast
    // (Step 3 rendert puckData, niet variant-groups) — o.a. via de Step 1
    // "Doorgaan"-CTA en de derive-auto-trigger. Benigne SSE-complete i.p.v.
    // een 4xx zodat callers gewoon doorlopen zonder error-banner; bestaande
    // legacy variant-groups blijven leesbaar (dit gate alleen NIEUWE runs).
    const persistedInputs = (deliverable.settings && typeof deliverable.settings === 'object' && !Array.isArray(deliverable.settings)
      ? ((deliverable.settings as Record<string, unknown>).contentTypeInputs ?? null)
      : null) as Record<string, unknown> | null;
    if (isPuckRenderable(deliverable.contentType, persistedInputs)) {
      console.warn(
        '[POST /api/studio/orchestrate] skipped: contentType=%s gebruikt het structured-variant-pad (deliverable %s)',
        deliverable.contentType,
        deliverableId,
      );
      const skipEncoder = new TextEncoder();
      const skipStream = new ReadableStream({
        start(controller) {
          controller.enqueue(skipEncoder.encode(
            `event: complete\ndata: ${JSON.stringify({ skipped: true, reason: 'puck-webpage-type' })}\n\n`,
          ));
          controller.close();
        },
      });
      return new Response(skipStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
        },
      });
    }

    // Parse and validate body
    let body: z.infer<typeof orchestrateBodySchema> = {};
    try {
      const rawBody = await request.json();
      body = orchestrateBodySchema.parse(rawBody);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request body', details: err.issues },
          { status: 400 },
        );
      }
      if (err instanceof SyntaxError) {
        return NextResponse.json(
          { error: 'Malformed JSON in request body' },
          { status: 400 },
        );
      }
      // No body at all — use defaults
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(event: string, data: unknown) {
          try {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
            );
          } catch {
            /* stream closed */
          }
        }

        // Heartbeat every 15s to prevent connection drops
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          } catch {
            /* stream closed */
          }
        }, 15_000);

        try {
          // Serialize user-selected knowledge context items into prompt text
          let additionalContextText: string | undefined;
          if (body.additionalContextItems && body.additionalContextItems.length > 0) {
            const serialized = await serializeContextForPrompt(
              body.additionalContextItems,
              workspaceId,
            );
            if (serialized) {
              additionalContextText = serialized;
            }
          }

          // Content-locale Fase 2: expliciete target-taal → find-or-create profiel,
          // persist op de deliverable (her-genereren behoudt de taal) + thread door.
          let targetLocaleProfileId: string | undefined;
          if (body.targetLanguage) {
            const targetProfile = await resolveTargetProfile(workspaceId, body.targetLanguage);
            if (targetProfile) {
              targetLocaleProfileId = targetProfile.id;
              await prisma.deliverable.update({
                where: { id: deliverableId },
                data: { localeProfileId: targetProfile.id },
              });
            }
          }

          const generator = orchestrateContentGeneration(
            deliverableId,
            workspaceId,
            {
              instruction: body.instruction,
              regenerateGroup: body.regenerateGroup,
              userFeedback: body.userFeedback,
              additionalContextText,
              mediumConfig: body.mediumConfig,
              seoInput: body.seoInput,
              contentTypeInputs: body.contentTypeInputs,
              targetLocaleProfileId,
            },
          );

          for await (const event of generator) {
            sendEvent(event.event, event.data);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('[POST /api/studio/orchestrate] Pipeline error:', message);
          // Classify so the client can distinguish "model offline" from a
          // generic failure. recoverable:false preserves prior semantics.
          sendEvent('error', buildAiErrorEvent(error, { recoverable: false }));
        } finally {
          clearInterval(heartbeat);
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (error) {
    console.error('[POST /api/studio/[deliverableId]/orchestrate]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
