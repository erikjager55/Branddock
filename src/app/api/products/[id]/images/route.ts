import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { requireUnlocked } from "@/lib/lock-guard";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { ProductImageCategory } from "@prisma/client";

const MAX_IMAGES_PER_PRODUCT = 20;

const addImageSchema = z.object({
  url: z.string().url(),
  category: z.string().max(50).optional(),
  altText: z.string().max(500).optional(),
});

// POST /api/products/:id/images — Add an image to a product
export async function POST(
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
    const parsed = addImageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Check image count limit
    const imageCount = await prisma.productImage.count({ where: { productId: id } });
    if (imageCount >= MAX_IMAGES_PER_PRODUCT) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_IMAGES_PER_PRODUCT} images per product reached` },
        { status: 400 },
      );
    }

    // Determine next sort order
    const lastImage = await prisma.productImage.findFirst({
      where: { productId: id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const nextOrder = (lastImage?.sortOrder ?? -1) + 1;

    const validCategories = Object.values(ProductImageCategory) as string[];
    const category = parsed.data.category && validCategories.includes(parsed.data.category)
      ? (parsed.data.category as ProductImageCategory)
      : ProductImageCategory.OTHER;

    const image = await prisma.productImage.create({
      data: {
        url: parsed.data.url,
        category,
        altText: parsed.data.altText ?? null,
        sortOrder: nextOrder,
        source: "URL_ADDED",
        productId: id,
      },
    });

    invalidateCache(cacheKeys.prefixes.products(workspaceId));

    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    console.error("[POST /api/products/:id/images]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
