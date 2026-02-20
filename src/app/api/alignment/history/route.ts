import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/alignment/history — scan history
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const scans = await prisma.alignmentScan.findMany({
      where: { workspaceId },
      orderBy: { startedAt: "desc" },
      include: {
        moduleScores: { orderBy: { moduleName: "asc" } },
        _count: { select: { issues: true } },
      },
    });

    return NextResponse.json({
      scans: scans.map((s) => ({
        id: s.id,
        score: s.score,
        totalItems: s.totalItems,
        alignedCount: s.alignedCount,
        reviewCount: s.reviewCount,
        misalignedCount: s.misalignedCount,
        status: s.status,
        startedAt: s.startedAt.toISOString(),
        completedAt: s.completedAt?.toISOString() ?? null,
        issuesCount: s._count.issues,
        modules: s.moduleScores.map((m) => ({
          moduleName: m.moduleName,
          score: m.score,
        })),
      })),
    });
  } catch (error) {
    console.error("[GET /api/alignment/history]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
