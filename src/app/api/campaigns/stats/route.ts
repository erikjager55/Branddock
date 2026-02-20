import { NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { getCampaignStats } from "@/lib/db/queries";

// ---------------------------------------------------------------------------
// GET /api/campaigns/stats — Campaign statistics for the workspace
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const stats = await getCampaignStats(workspaceId);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("[GET /api/campaigns/stats]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
