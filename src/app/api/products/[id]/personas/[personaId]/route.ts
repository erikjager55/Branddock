import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { resolveWorkspaceForProduct } from "@/lib/products/resolve-workspace";

// DELETE /api/products/:id/personas/:personaId — unlink
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; personaId: string }> }
) {
  try {
    const { id, personaId } = await params;

    const workspaceId = await resolveWorkspaceForProduct(id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    // Check if link exists
    const link = await prisma.productPersona.findUnique({
      where: { productId_personaId: { productId: id, personaId } },
    });
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    await prisma.productPersona.delete({
      where: { productId_personaId: { productId: id, personaId } },
    });

    invalidateCache(cacheKeys.prefixes.products(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/products/:id/personas/:personaId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
