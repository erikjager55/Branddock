import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/alignment/modules — per-module scores from latest scan
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const scan = await prisma.alignmentScan.findFirst({
      where: { workspaceId, status: "COMPLETED" },
      orderBy: { startedAt: "desc" },
      include: {
        moduleScores: { orderBy: { moduleName: "asc" } },
      },
    });

    if (!scan) {
      return NextResponse.json({ modules: [] });
    }

    return NextResponse.json({
      scanId: scan.id,
      modules: scan.moduleScores.map((m) => ({
        id: m.id,
        moduleName: m.moduleName,
        score: m.score,
        alignedCount: m.alignedCount,
        reviewCount: m.reviewCount,
        misalignedCount: m.misalignedCount,
        lastCheckedAt: m.lastCheckedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[GET /api/alignment/modules]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
