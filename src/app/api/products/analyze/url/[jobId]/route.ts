import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";

// GET /api/products/analyze/url/:jobId — polling stub (always 404)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { jobId } = await params;

    return NextResponse.json(
      { error: `Job ${jobId} not found` },
      { status: 404 },
    );
  } catch (error) {
    console.error("[GET /api/products/analyze/url/:jobId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
