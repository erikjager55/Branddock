import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";

// GET /api/personas/[id]/export
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    await getServerSession();
    await params; // consume params

    return NextResponse.json(
      { error: "Export not yet available" },
      { status: 501 }
    );
  } catch (error) {
    console.error("[GET /api/personas/:id/export]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
