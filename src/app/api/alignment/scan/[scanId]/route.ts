import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { getScanProgress } from "@/lib/alignment/scanner";
import { SCAN_STEPS } from "@/lib/alignment/scan-steps";

type RouteParams = { params: Promise<{ scanId: string }> };

// =============================================================
// GET /api/alignment/scan/:scanId — poll scan status + progress
// Returns in-memory progress while RUNNING, DB data when done
// =============================================================
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { scanId } = await params;

    const scan = await prisma.alignmentScan.findFirst({
      where: { id: scanId, workspaceId },
      include: {
        moduleScores: { orderBy: { moduleName: "asc" } },
        _count: { select: { issues: true } },
      },
    });

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    // If still RUNNING, return in-memory progress
    if (scan.status === "RUNNING") {
      const progress = getScanProgress(scanId);
      return NextResponse.json({
        scanId: scan.id,
        status: "RUNNING" as const,
        progress: progress?.progress ?? 0,
        currentStep: progress?.currentStep ?? 0,
        completedSteps: progress?.completedSteps ?? [],
      });
    }

    // Completed/Failed/Cancelled — return DB data
    return NextResponse.json({
      scanId: scan.id,
      status: scan.status,
      progress: 100,
      currentStep: SCAN_STEPS.length - 1,
      completedSteps: [...SCAN_STEPS],
      score: scan.score,
      issuesFound: scan._count.issues,
    });
  } catch (error) {
    console.error("[GET /api/alignment/scan/:scanId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
