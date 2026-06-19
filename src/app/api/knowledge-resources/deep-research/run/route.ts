import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { withAiRateLimit } from "@/lib/ai/middleware";
import { trackEvent } from "@/lib/analytics/posthog";
import { runDeepResearch } from "@/lib/knowledge-research/orchestrator";
import type { DeepResearchEvent } from "@/lib/knowledge-research/types";

export const maxDuration = 600;

const answerSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
});

const requestSchema = z.object({
  topic: z.string().trim().min(3, "Topic must be at least 3 characters"),
  answers: z.array(answerSchema).default([]),
  useBrandContext: z.boolean().optional(),
});

/**
 * POST /api/knowledge-resources/deep-research/run (SSE)
 *
 * Streamt de deep-research-pipeline-events en sluit af met een `complete`-event
 * dat het rapport draagt. Schrijft NIET naar de DB. Bij client-abort wordt de
 * stream stil afgehandeld (geen `complete`/`error`-event).
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    const { topic, answers, useBrandContext } = parsed.data;

    const encoder = new TextEncoder();
    const startedAt = Date.now();

    const stream = new ReadableStream({
      async start(controller) {
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch {
            /* stream closed */
          }
        }, 30_000);

        // Koppel de inkomende request-cancel aan een AbortController die de
        // pipeline aan elke fase controleert.
        const abortController = new AbortController();
        const onAbort = () => abortController.abort();
        request.signal.addEventListener("abort", onAbort);

        function sendEvent(event: DeepResearchEvent) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } catch {
            /* stream closed */
          }
        }

        // Analytics mag nooit de stream/heartbeat omverhalen → altijd zwaluwstaarten.
        await trackEvent({
          event: "deep_research_started",
          workspaceId,
          properties: { topic_length: topic.length, use_brand_context: !!useBrandContext },
        }).catch(() => {});

        try {
          const report = await runDeepResearch({
            workspaceId,
            topic,
            answers,
            useBrandContext: !!useBrandContext,
            sendEvent,
            signal: abortController.signal,
          });

          sendEvent({ type: "complete", report });

          await trackEvent({
            event: "deep_research_completed",
            workspaceId,
            properties: {
              duration_ms: Date.now() - startedAt,
              source_count: report.sources.length,
              used_source_count: report.sources.filter((s) => s.used).length,
              warning_count: report.warnings.length,
            },
          }).catch(() => {});
        } catch (error) {
          // Client-abort / deadline → stil afhandelen, geen error-event.
          if (error instanceof DOMException && error.name === "AbortError") {
            await trackEvent({
              event: "deep_research_aborted",
              workspaceId,
              properties: { duration_ms: Date.now() - startedAt },
            }).catch(() => {});
          } else {
            const message = error instanceof Error ? error.message : "Unknown error";
            console.error("[deep-research/run] Error:", message);
            sendEvent({ type: "error", error: message });
            await trackEvent({
              event: "deep_research_failed",
              workspaceId,
              properties: { duration_ms: Date.now() - startedAt, error: message },
            }).catch(() => {});
          }
        } finally {
          clearInterval(heartbeat);
          request.signal.removeEventListener("abort", onAbort);
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
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[POST /api/knowledge-resources/deep-research/run]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
