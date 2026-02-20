import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";

// POST /api/personas/[id]/regenerate
export async function POST(
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
      { error: "AI regeneration not yet available" },
      { status: 501 }
    );
  } catch (error) {
    console.error("[POST /api/personas/:id/regenerate]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
