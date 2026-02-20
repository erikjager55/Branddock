import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/research/active — active (IN_PROGRESS) studies
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const studies = await prisma.researchStudy.findMany({
      where: { workspaceId, status: "IN_PROGRESS" },
      orderBy: { lastActivityAt: "desc" },
    });

    // ResearchStudy has personaId and brandAssetId but NO Prisma relations.
    // Separately query persona and brand asset names.
    const personaIds = studies.map((s) => s.personaId).filter(Boolean) as string[];
    const assetIds = studies.map((s) => s.brandAssetId).filter(Boolean) as string[];

    const [personas, assets] = await Promise.all([
      personaIds.length > 0
        ? prisma.persona.findMany({
            where: { id: { in: personaIds } },
            select: { id: true, name: true },
          })
        : [],
      assetIds.length > 0
        ? prisma.brandAsset.findMany({
            where: { id: { in: assetIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);

    const personaMap = new Map(personas.map((p) => [p.id, p.name]));
    const assetMap = new Map(assets.map((a) => [a.id, a.name]));

    const items = studies.map((s) => ({
      id: s.id,
      personaName: s.personaId ? personaMap.get(s.personaId) : undefined,
      assetName: s.brandAssetId ? assetMap.get(s.brandAssetId) : undefined,
      method: s.method,
      progress: s.progress,
      lastActivityAt: s.lastActivityAt.toISOString(),
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[GET /api/research/active]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
