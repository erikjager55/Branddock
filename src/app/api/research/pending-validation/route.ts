import { NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/research/pending-validation — stub: hardcoded items
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    return NextResponse.json({
      items: [
        {
          id: "pv-1",
          assetName: "Brand Promise",
          assetType: "Brand Asset",
          status: "Ready For Validation",
          completedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: "pv-2",
          assetName: "Golden Circle",
          assetType: "Brand Asset",
          status: "Ready For Validation",
          completedAt: new Date(Date.now() - 172800000).toISOString(),
        },
      ],
    });
  } catch (error) {
    console.error("[GET /api/research/pending-validation]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
