import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";

// ---------------------------------------------------------------------------
// GET /api/campaigns/quick/prompt-suggestions — Return static suggestions
// ---------------------------------------------------------------------------
export async function GET(_request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    return NextResponse.json({
      suggestions: [
        "Write a thought leadership piece about...",
        "Create an engaging social post about...",
        "Draft a product launch announcement...",
        "Develop a brand story that...",
      ],
    });
  } catch (error) {
    console.error("[GET /api/campaigns/quick/prompt-suggestions]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
