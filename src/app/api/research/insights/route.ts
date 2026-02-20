import { NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/research/insights — stub: hardcoded QuickInsight items
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    return NextResponse.json({
      insights: [
        {
          id: "qi-1",
          type: "progress",
          title: "Research Progress",
          description: "Your brand research is 65% complete across all active studies.",
        },
        {
          id: "qi-2",
          type: "momentum",
          title: "Strong Momentum",
          description: "3 studies advanced this week, maintaining a consistent research pace.",
        },
        {
          id: "qi-3",
          type: "balance",
          title: "Method Balance",
          description: "Consider adding qualitative methods to complement your quantitative research.",
        },
      ],
    });
  } catch (error) {
    console.error("[GET /api/research/insights]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
