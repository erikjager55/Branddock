import { NextResponse } from "next/server";

// =============================================================
// POST /api/strategies/[id]/link-campaign — stub 501
// =============================================================
export async function POST() {
  return NextResponse.json(
    { error: "Campaign module not yet available" },
    { status: 501 },
  );
}
