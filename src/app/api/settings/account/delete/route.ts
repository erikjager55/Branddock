import { NextResponse } from "next/server";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// POST /api/settings/account/delete — Stub account deletion
// =============================================================
export async function POST() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    // Stub: don't actually delete. Placeholder for future email confirmation flow.
    return NextResponse.json({
      success: true,
      message: "Account deletion scheduled",
    });
  } catch (error) {
    console.error("[POST /api/settings/account/delete]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
