import { NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";

// GET /api/workspace/active — returns the resolved workspace ID for the current session
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();

    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 403 }
      );
    }

    return NextResponse.json({ workspaceId }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error("[GET /api/workspace/active]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
