import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUnlocked } from "@/lib/lock-guard";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { resolveWorkspaceForProduct } from "@/lib/products/resolve-workspace";
import { validateBinaryFile } from "@/lib/security/file-validator";
import { getStorageProvider } from "@/lib/storage";
import type { ProductImageCategory } from "@prisma/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES_PER_PRODUCT = 20;
const ALLOWED_TYPES: ReadonlySet<string> = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

/** Hardcoded enum values — Prisma enums are not available at Next.js runtime */
const VALID_IMAGE_CATEGORIES: string[] = [
  "HERO", "LIFESTYLE", "DETAIL", "SCREENSHOT", "FEATURE", "MOCKUP",
  "PACKAGING", "VARIANT", "GROUP", "DIAGRAM", "PROCESS", "TEAM", "OTHER",
];

// POST /api/products/:id/images/upload — Upload an image file
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

    // Check image count limit
    const imageCount = await prisma.productImage.count({ where: { productId: id } });
    if (imageCount >= MAX_IMAGES_PER_PRODUCT) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_IMAGES_PER_PRODUCT} images per product reached` },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const categoryRaw = formData.get("category") as string | null;
    const altText = formData.get("altText") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPG, WEBP" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic-byte MIME validation — catches client-header spoofing
    const contentCheck = await validateBinaryFile(buffer, ALLOWED_TYPES);
    if (!contentCheck.ok) {
      return NextResponse.json(
        { error: contentCheck.error ?? "Invalid file content" },
        { status: 400 },
      );
    }

    // Serverless-safe: via de storage-provider (R2 in prod, local in dev) i.p.v.
    // direct naar public/uploads (read-only fs op Vercel).
    const { url: publicUrl } = await getStorageProvider().upload(buffer, {
      workspaceId,
      fileName: file.name,
      contentType: file.type,
      generateThumbnail: false,
    });

    // Determine next sort order
    const lastImage = await prisma.productImage.findFirst({
      where: { productId: id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const nextOrder = (lastImage?.sortOrder ?? -1) + 1;

    const category = categoryRaw && VALID_IMAGE_CATEGORIES.includes(categoryRaw)
      ? (categoryRaw as ProductImageCategory)
      : ("OTHER" as ProductImageCategory);

    const image = await prisma.productImage.create({
      data: {
        url: publicUrl,
        category,
        altText: altText?.trim() || null,
        sortOrder: nextOrder,
        source: "UPLOADED",
        productId: id,
      },
    });

    invalidateCache(cacheKeys.prefixes.products(workspaceId));

    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    console.error("[POST /api/products/:id/images/upload]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
