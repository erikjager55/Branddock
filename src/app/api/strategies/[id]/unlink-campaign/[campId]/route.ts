import { NextResponse } from "next/server";

// =============================================================
// DELETE /api/strategies/[id]/unlink-campaign/[campId] — stub 501
// =============================================================
export async function DELETE() {
  return NextResponse.json(
    { error: "Campaign module not yet available" },
    { status: 501 },
  );
}
