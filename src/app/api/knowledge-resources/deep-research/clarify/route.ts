import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { withAiRateLimit } from "@/lib/ai/middleware";
import { generateClarifyingQuestions } from "@/lib/knowledge-research/clarify";
import type { ClarifyResponse } from "@/lib/knowledge-research/types";

export const maxDuration = 60;

const requestSchema = z.object({
  topic: z.string().trim().min(3, "Topic must be at least 3 characters"),
  useBrandContext: z.boolean().optional(),
});

/**
 * POST /api/knowledge-resources/deep-research/clarify
 *
 * Genereert 2-3 verfijningsvragen voor een deep-research-topic. Schrijft NIET
 * naar de DB. 403 wanneer er geen workspace resolved kan worden.
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

    const questions = await generateClarifyingQuestions({
      workspaceId,
      topic: parsed.data.topic,
      useBrandContext: parsed.data.useBrandContext,
      signal: request.signal,
    });

    const body: ClarifyResponse = { questions };
    return NextResponse.json(body);
  } catch (error) {
    console.error("[POST /api/knowledge-resources/deep-research/clarify]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
