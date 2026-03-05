import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { requireUnlocked } from "@/lib/lock-guard";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { ProductImageCategory } from "@prisma/client";

const updateImageSchema = z.object({
  category: z.string().max(50).optional(),
  altText: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// PATCH /api/products/:id/images/:imageId — Update image category/altText/sortOrder
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, imageId } = await params;

    const lockResponse = await requireUnlocked("product", id);
    if (lockResponse) return lockResponse;

    // Verify product belongs to workspace
    const product = await prisma.product.findFirst({
      where: { id, workspaceId },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Verify image belongs to product
    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId: id },
    });
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateImageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.category !== undefined) {
      const validCategories = Object.values(ProductImageCategory) as string[];
      data.category = validCategories.includes(parsed.data.category)
        ? parsed.data.category
        : "OTHER";
    }
    if (parsed.data.altText !== undefined) {
      data.altText = parsed.data.altText;
    }
    if (parsed.data.sortOrder !== undefined) {
      data.sortOrder = parsed.data.sortOrder;
    }

    const updated = await prisma.productImage.update({
      where: { id: imageId },
      data,
    });

    invalidateCache(cacheKeys.prefixes.products(workspaceId));

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/products/:id/images/:imageId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/products/:id/images/:imageId — Remove an image
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, imageId } = await params;

    const lockResponse = await requireUnlocked("product", id);
    if (lockResponse) return lockResponse;

    // Verify product belongs to workspace
    const product = await prisma.product.findFirst({
      where: { id, workspaceId },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Verify image belongs to product
    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId: id },
    });
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    await prisma.productImage.delete({ where: { id: imageId } });

    invalidateCache(cacheKeys.prefixes.products(workspaceId));

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/products/:id/images/:imageId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
