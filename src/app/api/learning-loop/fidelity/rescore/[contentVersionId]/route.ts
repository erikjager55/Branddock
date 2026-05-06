import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { withAiRateLimit } from "@/lib/ai/middleware";
import { scoreContentFidelity } from "@/lib/learning-loop";
import { emitLearningEvent } from "@/lib/learning-loop";

/**
 * POST /api/learning-loop/fidelity/rescore/[contentVersionId]
 *
 * On-demand fidelity scoring voor een content-versie. Schrijft een nieuwe
 * `ContentFidelityScore`-row (1:N — multi-judge support).
 *
 * Use cases:
 * - Re-score na prompt-template wijziging om regressie te detecteren
 * - Multi-judge analyse (meerdere judges per versie)
 * - Manual trigger voor pre-existing ContentVersions
 *
 * Body (optioneel):
 *   { judgeIdentifier?: string }  // default 'claude-judge-fidelity'
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contentVersionId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    const { contentVersionId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      judgeIdentifier?: string;
    };

    const result = await scoreContentFidelity({
      contentVersionId,
      workspaceId,
      judgeIdentifier: body.judgeIdentifier,
    });

    // Emit fidelity.scored event for unified event-log
    void emitLearningEvent({
      workspaceId,
      payload: {
        type: "fidelity.scored",
        data: {
          scoreId: result.scoreId,
          contentVersionId: result.contentVersionId,
          compositeScore: result.compositeScore,
          thresholdMet: result.thresholdMet,
          judgeIdentifier: body.judgeIdentifier ?? "claude-judge-fidelity",
        },
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.includes("insufficient content")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[POST /api/learning-loop/fidelity/rescore]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
