import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { requireUnlocked } from "@/lib/lock-guard";

const RESEARCH_WEIGHTS: Record<string, number> = {
  AI_EXPLORATION: 0.15,
  WORKSHOP: 0.30,
  INTERVIEWS: 0.25,
  QUESTIONNAIRE: 0.30,
};

function calculateValidationPercentage(
  methods: Array<{ method: string; status: string; progress: number }>
): number {
  let total = 0;
  for (const m of methods) {
    const weight = RESEARCH_WEIGHTS[m.method] ?? 0;
    if (m.status === "COMPLETED" || m.status === "VALIDATED") {
      total += weight * 100;
    } else if (m.status === "IN_PROGRESS") {
      total += weight * m.progress;
    }
  }
  return Math.round(total * 100) / 100;
}

// =============================================================
// GET /api/brand-assets/[id] — detail with research methods, versions, validation %
// =============================================================
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const asset = await prisma.brandAsset.findFirst({
      where: { id, workspaceId },
      include: {
        researchMethods: {
          orderBy: { method: "asc" },
        },
        versions: {
          orderBy: { version: "desc" },
          take: 10,
          include: {
            changedBy: { select: { id: true, name: true, email: true } },
          },
        },
        lockedBy: { select: { id: true, name: true, email: true } },
        aiAnalysisSessions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, progress: true, completedAt: true },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const validationPercentage = calculateValidationPercentage(
      asset.researchMethods.map((m) => ({
        method: m.method,
        status: m.status,
        progress: m.progress,
      }))
    );

    const completedMethods = asset.researchMethods.filter(
      (m) => m.status === "COMPLETED" || m.status === "VALIDATED"
    ).length;

    return NextResponse.json({
      ...asset,
      validationPercentage,
      completedMethods,
      totalMethods: asset.researchMethods.length,
    });
  } catch (error) {
    console.error("[GET /api/brand-assets/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// DELETE /api/brand-assets/[id] — cascade delete
// =============================================================
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const lockResponse = await requireUnlocked("brandAsset", id);
    if (lockResponse) return lockResponse;

    const asset = await prisma.brandAsset.findFirst({
      where: { id, workspaceId },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    await prisma.brandAsset.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/brand-assets/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
