import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/alignment — latest scan result (score, modules, openIssuesCount)
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const scan = await prisma.alignmentScan.findFirst({
      where: { workspaceId },
      orderBy: { startedAt: "desc" },
      include: {
        moduleScores: { orderBy: { moduleName: "asc" } },
        issues: { where: { status: "OPEN" }, select: { id: true } },
      },
    });

    if (!scan) {
      return NextResponse.json({
        hasScan: false,
        scan: null,
        modules: [],
        openIssuesCount: 0,
      });
    }

    return NextResponse.json({
      hasScan: true,
      scan: {
        id: scan.id,
        score: scan.score,
        totalItems: scan.totalItems,
        alignedCount: scan.alignedCount,
        reviewCount: scan.reviewCount,
        misalignedCount: scan.misalignedCount,
        status: scan.status,
        startedAt: scan.startedAt.toISOString(),
        completedAt: scan.completedAt?.toISOString() ?? null,
      },
      modules: scan.moduleScores.map((m) => ({
        id: m.id,
        moduleName: m.moduleName,
        score: m.score,
        alignedCount: m.alignedCount,
        reviewCount: m.reviewCount,
        misalignedCount: m.misalignedCount,
        lastCheckedAt: m.lastCheckedAt.toISOString(),
      })),
      openIssuesCount: scan.issues.length,
    });
  } catch (error) {
    console.error("[GET /api/alignment]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
