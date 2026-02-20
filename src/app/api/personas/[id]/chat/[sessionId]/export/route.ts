import { NextResponse } from "next/server";

// GET /api/personas/[id]/chat/[sessionId]/export — stub
export async function GET() {
  return NextResponse.json(
    { error: "Export not yet available" },
    { status: 501 }
  );
}
