import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { runBrandAudit } from "@/lib/alignment/auditor";
import type {
  BrandAuditResult,
  AuditDimension,
  AssetAuditScore,
  ImprovementPoint,
} from "@/types/brand-alignment";

// =============================================================
// GET /api/alignment/audit — fetch latest audit result
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const audit = await prisma.brandAudit.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    if (!audit) {
      return NextResponse.json({ hasAudit: false, audit: null });
    }

    const result: BrandAuditResult = {
      id: audit.id,
      overallScore: audit.overallScore,
      dimensions: audit.dimensions as unknown as AuditDimension[],
      assetScores: audit.assetScores as unknown as AssetAuditScore[],
      improvements: audit.improvements as unknown as ImprovementPoint[],
      createdAt: audit.createdAt.toISOString(),
    };

    return NextResponse.json({ hasAudit: true, audit: result });
  } catch (error) {
    console.error("[alignment/audit] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand audit" },
      { status: 500 }
    );
  }
}

// =============================================================
// POST /api/alignment/audit — run a new brand audit
// =============================================================
export async function POST() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const result = await runBrandAudit(workspaceId);

    return NextResponse.json({
      auditId: result.id,
      status: "COMPLETED" as const,
    });
  } catch (error) {
    console.error("[alignment/audit] POST error:", error);
    return NextResponse.json(
      { error: "Failed to run brand audit" },
      { status: 500 }
    );
  }
}
