import { NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/research/recommended-actions — stub: hardcoded items
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    return NextResponse.json({
      actions: [
        {
          id: "ra-1",
          type: "brand",
          title: "Complete Brand Promise Validation",
          description: "Your Brand Promise needs interview validation to reach full confidence.",
          targetRoute: "brand",
        },
        {
          id: "ra-2",
          type: "persona",
          title: "Update Sarah Chen Persona",
          description: "New research data available. Review and update persona insights.",
          targetRoute: "personas",
        },
        {
          id: "ra-3",
          type: "strategy",
          title: "Align Strategy with Findings",
          description: "Recent research findings may impact your growth strategy objectives.",
          targetRoute: "business-strategy",
        },
      ],
    });
  } catch (error) {
    console.error("[GET /api/research/recommended-actions]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
