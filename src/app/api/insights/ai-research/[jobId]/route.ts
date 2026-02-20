import { NextResponse } from "next/server";

// =============================================================
// GET /api/insights/ai-research/[jobId]
// Stub poll endpoint for future async AI research.
// =============================================================
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
