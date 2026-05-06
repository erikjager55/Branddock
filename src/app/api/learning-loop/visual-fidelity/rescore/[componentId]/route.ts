import { NextResponse, type NextRequest } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { withAiRateLimit } from "@/lib/ai/middleware";
import { scoreImageFidelity } from "@/lib/brand-fidelity/visual-fidelity-scorer";

/**
 * POST /api/learning-loop/visual-fidelity/rescore/[componentId]
 *
 * Re-score a generated image (DeliverableComponent.imageUrl) against
 * the workspace brand visual identity. Combines deterministic color
 * alignment + AI-judge composite into one ContentVisualFidelityScore
 * record. Emits fidelity.scored LearningEvent (entity=ContentVisualFidelityScore).
 *
 * Body (optional):
 *   { judgeIdentifier?: string }   // default 'claude-judge-visual-fidelity'
 *
 * Status codes:
 *   200 — score persisted, returns { scoreId, compositeScore, thresholdMet, judgeSkipped }
 *   400 — component has no imageUrl
 *   403 — no workspace / rate-limited
 *   404 — component not found in workspace
 *   500 — image fetch / sharp / DB error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ componentId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    const { componentId } = await params;

    const body = (await request.json().catch(() => ({}))) as {
      judgeIdentifier?: string;
    };

    const result = await scoreImageFidelity({
      componentId,
      workspaceId,
      judgeIdentifier: body.judgeIdentifier,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.includes("no imageUrl")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[POST /api/learning-loop/visual-fidelity/rescore]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
