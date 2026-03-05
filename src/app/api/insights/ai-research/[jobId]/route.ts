import { NextResponse } from "next/server";

// =============================================================
// GET /api/insights/ai-research/[jobId]
// AI research is synchronous — no polling needed. This endpoint
// exists only to return a clear error if called.
// =============================================================
export async function GET() {
  return NextResponse.json(
    { error: "AI research is synchronous. Results are returned directly from POST /api/insights/ai-research." },
    { status: 410 },
  );
}
