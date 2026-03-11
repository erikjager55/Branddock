import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

// DELETE /api/competitors/[id]/products/[productId] — Unlink a product
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, productId } = await params;

    const competitor = await prisma.competitor.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!competitor) {
      return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
    }

    await prisma.competitorProduct.delete({
      where: {
        competitorId_productId: { competitorId: id, productId },
      },
    });

    invalidateCache(cacheKeys.prefixes.competitors(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/competitors/:id/products/:productId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
