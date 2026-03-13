import { NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { getAvailableContextItems } from "@/lib/ai/context/fetcher";

// GET /api/campaigns/wizard/knowledge — Knowledge context items for the campaign wizard
// Uses the same context fetcher as persona chat "Add Context"
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const groups = await getAvailableContextItems(workspaceId);

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("[GET /api/campaigns/wizard/knowledge]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
