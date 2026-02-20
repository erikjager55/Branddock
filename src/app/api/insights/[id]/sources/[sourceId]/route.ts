import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

type RouteParams = { params: Promise<{ id: string; sourceId: string }> };

// =============================================================
// DELETE /api/insights/:id/sources/:sourceId — remove source URL
// =============================================================
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, sourceId } = await params;

    // Verify insight belongs to workspace
    const insight = await prisma.marketInsight.findFirst({
      where: { id, workspaceId },
    });
    if (!insight) {
      return NextResponse.json({ error: "Insight not found" }, { status: 404 });
    }

    // Verify source belongs to insight
    const source = await prisma.insightSourceUrl.findFirst({
      where: { id: sourceId, insightId: id },
    });
    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    await prisma.insightSourceUrl.delete({ where: { id: sourceId } });

    invalidateCache(cacheKeys.prefixes.insights(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/insights/:id/sources/:sourceId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
