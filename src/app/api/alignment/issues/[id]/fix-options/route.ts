import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { generateFixOptions } from "@/lib/alignment/fix-generator";

type RouteParams = { params: Promise<{ id: string }> };

// =============================================================
// GET /api/alignment/issues/:id/fix-options — generate 3 fix options
// =============================================================
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const options = await generateFixOptions(id, workspaceId);
    return NextResponse.json(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Issue not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("[GET /api/alignment/issues/:id/fix-options]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
