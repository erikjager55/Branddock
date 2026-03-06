import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUnlocked } from "@/lib/lock-guard";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { resolveWorkspaceForProduct } from "@/lib/products/resolve-workspace";
import type { ProductImageCategory } from "@prisma/client";

const MAX_IMAGES_PER_PRODUCT = 20;

/** Hardcoded enum values — Prisma enums are not available at Next.js runtime */
const VALID_IMAGE_CATEGORIES: string[] = [
  "HERO", "LIFESTYLE", "DETAIL", "SCREENSHOT", "FEATURE", "MOCKUP",
  "PACKAGING", "VARIANT", "GROUP", "DIAGRAM", "PROCESS", "TEAM", "OTHER",
];

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
    const { id } = await params;

    const workspaceId = await resolveWorkspaceForProduct(id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const lockResponse = await requireUnlocked("product", id);
    if (lockResponse) return lockResponse;

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

    const category = parsed.data.category && VALID_IMAGE_CATEGORIES.includes(parsed.data.category)
      ? (parsed.data.category as ProductImageCategory)
      : ("OTHER" as ProductImageCategory);

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
