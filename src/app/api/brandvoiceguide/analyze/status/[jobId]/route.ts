// =============================================================
// GET /api/brandvoiceguide/analyze/status/[jobId]
//
// Polled by the analyzer UI. Returns the in-memory progress record
// (or 404 if not found / cleaned up after 30 min).
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { getVoiceAnalysisProgress } from "@/lib/brandvoice/voice-analyzer-engine";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { jobId } = await params;
    const progress = await getVoiceAnalysisProgress(jobId);
    if (!progress) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(progress);
  } catch (error) {
    console.error("[GET /api/brandvoiceguide/analyze/status]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
