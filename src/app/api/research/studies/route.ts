import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/research/studies — list studies for workspace
// =============================================================
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const where: Record<string, unknown> = { workspaceId };
    if (statusFilter) {
      where.status = statusFilter;
    }

    const studies = await prisma.researchStudy.findMany({
      where,
      orderBy: { lastActivityAt: "desc" },
    });

    const mapped = studies.map((s) => ({
      id: s.id,
      title: s.title,
      method: s.method,
      progress: s.progress,
      status: s.status,
      personaId: s.personaId,
      brandAssetId: s.brandAssetId,
      lastActivityAt: s.lastActivityAt.toISOString(),
    }));

    return NextResponse.json({ studies: mapped });
  } catch (error) {
    console.error("[GET /api/research/studies]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
