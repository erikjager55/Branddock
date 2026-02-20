import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/research/custom/available-assets — workspace brand assets
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const brandAssets = await prisma.brandAsset.findMany({
      where: { workspaceId },
      select: { id: true, name: true, category: true },
      take: 6,
      orderBy: { updatedAt: "desc" },
    });

    const categoryIconMap: Record<string, string> = {
      PURPOSE: "Heart",
      COMMUNICATION: "MessageSquare",
      STRATEGY: "Target",
      NARRATIVE: "BookOpen",
      CORE: "Star",
    };

    const assets = brandAssets.map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category,
      estimatedDuration: "2-3 weeks",
      icon: categoryIconMap[a.category] || "FileText",
      isRecommended: false,
    }));

    return NextResponse.json({ assets });
  } catch (error) {
    console.error("[GET /api/research/custom/available-assets]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
