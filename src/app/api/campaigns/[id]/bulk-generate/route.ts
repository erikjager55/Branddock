import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { orchestrateContentGeneration } from '@/lib/ai/canvas-orchestrator';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

// Allow up to 10 minutes for bulk generation of many deliverables
export const maxDuration = 600;

const MAX_CONCURRENCY = 3;

const bulkGenerateBodySchema = z.object({
  deliverableIds: z.array(z.string()).max(50).optional(),
});

// ---------------------------------------------------------------------------
// POST /api/campaigns/[id]/bulk-generate
// Generates content drafts for multiple deliverables in parallel via SSE.
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

    const { id: campaignId } = await params;

    // Verify campaign ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { workspaceId: true },
    });

    if (!campaign || campaign.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Parse body
    let body: z.infer<typeof bulkGenerateBodySchema> = {};
    try {
      const rawBody = await request.json();
      body = bulkGenerateBodySchema.parse(rawBody);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'Invalid request body', details: err.issues }, { status: 400 });
      }
      // No body — use defaults
    }

    // Fetch deliverables to generate
    const whereClause: Record<string, unknown> = { campaignId };
    if (body.deliverableIds?.length) {
      whereClause.id = { in: body.deliverableIds };
    } else {
      whereClause.status = 'NOT_STARTED';
    }

    const deliverables = await prisma.deliverable.findMany({
      where: whereClause,
      select: { id: true, title: true },
      orderBy: { createdAt: 'asc' },
    });

    if (deliverables.length === 0) {
      return NextResponse.json({ error: 'No deliverables to generate' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(event: string, data: unknown) {
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          } catch { /* stream closed */ }
        }

        const heartbeat = setInterval(() => {
          try { controller.enqueue(encoder.encode(': heartbeat\n\n')); } catch { /* stream closed */ }
        }, 15_000);

        const startTime = Date.now();
        let generated = 0;
        let failed = 0;
        const total = deliverables.length;

        // Send initial event
        sendEvent('start', {
          total,
          deliverables: deliverables.map((d) => ({ id: d.id, title: d.title })),
        });

        // Concurrency-limited parallel generation
        const queue = [...deliverables];
        let running = 0;
        const results: Promise<void>[] = [];

        function processNext(): Promise<void> | null {
          const item = queue.shift();
          if (!item) return null;

          running++;
          const index = total - queue.length - running;

          sendEvent('progress', {
            deliverableId: item.id,
            title: item.title,
            status: 'generating',
            index,
            total,
          });

          const promise = (async () => {
            try {
              // Consume the async generator — we only care about the final result
              const generator = orchestrateContentGeneration(item.id, workspaceId!);
              let hasError = false;
              for await (const event of generator) {
                if (event.event === 'error') {
                  hasError = true;
                  sendEvent('progress', {
                    deliverableId: item.id,
                    title: item.title,
                    status: 'error',
                    message: (event.data as { message?: string })?.message ?? 'Unknown error',
                    index,
                    total,
                  });
                  failed++;
                  break;
                }
              }

              if (!hasError) {
                // Update status to IN_PROGRESS
                await prisma.deliverable.update({
                  where: { id: item.id },
                  data: { status: 'IN_PROGRESS' },
                });

                generated++;
                sendEvent('progress', {
                  deliverableId: item.id,
                  title: item.title,
                  status: 'complete',
                  index,
                  total,
                });
              }
            } catch (err) {
              failed++;
              sendEvent('progress', {
                deliverableId: item.id,
                title: item.title,
                status: 'error',
                message: err instanceof Error ? err.message : 'Unknown error',
                index,
                total,
              });
            } finally {
              running--;
            }
          })();

          results.push(promise);
          return promise;
        }

        // Start initial batch
        const initialPromises: Promise<void>[] = [];
        for (let i = 0; i < MAX_CONCURRENCY && queue.length > 0; i++) {
          const p = processNext();
          if (p) initialPromises.push(p);
        }

        // Process remaining items as slots free up
        async function drainQueue() {
          await Promise.all(initialPromises);
          while (queue.length > 0 || running > 0) {
            if (running < MAX_CONCURRENCY && queue.length > 0) {
              processNext();
            }
            // Wait a bit for a slot to free up
            await new Promise((r) => setTimeout(r, 200));
          }
          // Wait for all remaining promises
          await Promise.allSettled(results);
        }

        try {
          await drainQueue();

          // Invalidate caches
          invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
          invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

          sendEvent('complete', {
            generated,
            failed,
            total,
            duration: Date.now() - startTime,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('[bulk-generate] Pipeline error:', message);
          sendEvent('error', { message });
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
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[bulk-generate] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
