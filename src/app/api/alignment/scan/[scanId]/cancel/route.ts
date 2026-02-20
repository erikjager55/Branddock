import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { cancelScan } from "@/lib/alignment/scanner";

type RouteParams = { params: Promise<{ scanId: string }> };

// =============================================================
// POST /api/alignment/scan/:scanId/cancel — cancel running scan
// =============================================================
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { scanId } = await params;

    // Verify ownership
    const scan = await prisma.alignmentScan.findFirst({
      where: { id: scanId, workspaceId },
    });

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    if (scan.status !== "RUNNING") {
      return NextResponse.json(
        { error: `Scan is already ${scan.status.toLowerCase()}` },
        { status: 409 }
      );
    }

    // Signal cancellation
    cancelScan(scanId);

    return NextResponse.json({ scanId, status: "CANCELLED" });
  } catch (error) {
    console.error("[POST /api/alignment/scan/:scanId/cancel]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
