import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { requireUnlocked } from "@/lib/lock-guard";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

const reorderSchema = z.object({
  imageIds: z.array(z.string()).min(1).max(50),
});

// PATCH /api/products/:id/images/reorder — Reorder images by setting sortOrder
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const lockResponse = await requireUnlocked("product", id);
    if (lockResponse) return lockResponse;

    // Verify product belongs to workspace
    const product = await prisma.product.findFirst({
      where: { id, workspaceId },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Update sortOrder for each image
    const updates = parsed.data.imageIds.map((imageId, idx) =>
      prisma.productImage.updateMany({
        where: { id: imageId, productId: id },
        data: { sortOrder: idx },
      }),
    );

    await prisma.$transaction(updates);

    invalidateCache(cacheKeys.prefixes.products(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/products/:id/images/reorder]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
