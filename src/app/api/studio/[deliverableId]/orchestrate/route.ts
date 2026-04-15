import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { orchestrateContentGeneration } from '@/lib/ai/canvas-orchestrator';
import { serializeContextForPrompt } from '@/lib/ai/context/fetcher';

// Allow up to 5 minutes for full generation pipeline (text + images)
export const maxDuration = 300;

const contextItemSchema = z.object({
  sourceType: z.string().max(100),
  sourceId: z.string().max(100),
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
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

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
            },
          );

          for await (const event of generator) {
            sendEvent(event.event, event.data);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('[POST /api/studio/orchestrate] Pipeline error:', message);
          sendEvent('error', { message, recoverable: false });
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
