import { NextResponse } from "next/server";

// =============================================================
// POST /api/brandstyle/export-pdf — genereer PDF (stub)
// =============================================================
export async function POST() {
  return NextResponse.json(
    { error: "PDF export is not yet implemented" },
    { status: 501 }
  );
}
