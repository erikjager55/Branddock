import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

// DELETE /api/products/:id/personas/:personaId — ontkoppel
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; personaId: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, personaId } = await params;

    // Verify product belongs to workspace
    const product = await prisma.product.findFirst({
      where: { id, workspaceId },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
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
