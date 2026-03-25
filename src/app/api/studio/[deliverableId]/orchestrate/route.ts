import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { orchestrateContentGeneration } from '@/lib/ai/canvas-orchestrator';

// Allow up to 5 minutes for full generation pipeline (text + images)
export const maxDuration = 300;

const orchestrateBodySchema = z.object({
  instruction: z.string().max(2000).optional(),
  regenerateGroup: z.string().max(100).optional(),
  userFeedback: z.string().max(5000).optional(),
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
          const generator = orchestrateContentGeneration(
            deliverableId,
            workspaceId,
            {
              instruction: body.instruction,
              regenerateGroup: body.regenerateGroup,
              userFeedback: body.userFeedback,
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
