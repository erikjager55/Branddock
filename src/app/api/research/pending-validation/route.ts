import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

/**
 * GET /api/research/pending-validation — items that completed AI Exploration
 * but haven't been validated yet (status COMPLETED, not VALIDATED).
 *
 * Returns brand assets + personas with their most recent completion timestamp.
 * Capped at 10 items, ordered most-recent-first.
 */
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const [brandMethods, personaMethods] = await Promise.all([
      prisma.brandAssetResearchMethod.findMany({
        where: {
          method: "AI_EXPLORATION",
          status: "COMPLETED",
          brandAsset: { workspaceId },
        },
        select: {
          id: true,
          completedAt: true,
          brandAsset: { select: { id: true, name: true } },
        },
        orderBy: { completedAt: "desc" },
        take: 10,
      }),
      prisma.personaResearchMethod.findMany({
        where: {
          method: "AI_EXPLORATION",
          status: "COMPLETED",
          persona: { workspaceId },
        },
        select: {
          id: true,
          completedAt: true,
          persona: { select: { id: true, name: true } },
        },
        orderBy: { completedAt: "desc" },
        take: 10,
      }),
    ]);

    const items = [
      ...brandMethods.map((m) => ({
        id: `ba-${m.id}`,
        assetId: m.brandAsset.id,
        assetName: m.brandAsset.name,
        assetType: "Brand Asset",
        status: "Ready For Validation",
        completedAt: m.completedAt?.toISOString() ?? null,
      })),
      ...personaMethods.map((m) => ({
        id: `p-${m.id}`,
        assetId: m.persona.id,
        assetName: m.persona.name,
        assetType: "Persona",
        status: "Ready For Validation",
        completedAt: m.completedAt?.toISOString() ?? null,
      })),
    ]
      .sort((a, b) => {
        // Most recent first; null timestamps sink to the bottom
        if (!a.completedAt) return 1;
        if (!b.completedAt) return -1;
        return b.completedAt.localeCompare(a.completedAt);
      })
      .slice(0, 10);

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[GET /api/research/pending-validation]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
