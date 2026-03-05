import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { PRODUCT_LIST_SELECT } from "@/lib/db/queries";
import { setCache, cachedJson, invalidateCache } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";
import { ProductStatus } from "@prisma/client";

// ─── Zod Schemas ────────────────────────────────────────────

const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  pricingModel: z.string().max(100).optional(),
  pricingDetails: z.string().max(2000).optional(),
  features: z
    .array(z.string().max(500))
    .max(20)
    .optional(),
  benefits: z
    .array(z.string().max(500))
    .max(10)
    .optional(),
  useCases: z
    .array(z.string().max(500))
    .max(10)
    .optional(),
  linkedPersonaIds: z
    .array(z.string())
    .max(20)
    .optional(),
  source: z.enum(["MANUAL", "WEBSITE_URL", "PDF_UPLOAD"]).optional(),
  sourceUrl: z.string().url().optional(),
  status: z.string().max(50).optional(),
  analysisData: z.unknown().optional(),
  images: z.array(z.object({
    url: z.string().url(),
    category: z.string().max(50).optional(),
    altText: z.string().max(500).optional(),
  })).max(20).optional(),
});

// GET /api/products
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") ?? "name";
    const sortOrder = searchParams.get("sortOrder") ?? "asc";

    // Cache unfiltered default requests
    const isUnfiltered = !category && !search && sortBy === "name" && sortOrder === "asc";
    if (isUnfiltered) {
      const hit = cachedJson(cacheKeys.products.list(workspaceId));
      if (hit) return hit;
    }

    const where: Record<string, unknown> = { workspaceId };
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const orderByMap: Record<string, string> = {
      name: "name",
      category: "category",
      updatedAt: "updatedAt",
      createdAt: "createdAt",
    };
    const orderByField = orderByMap[sortBy] ?? "name";
    const orderBy = { [orderByField]: sortOrder === "desc" ? "desc" : "asc" };

    const dbProducts = await prisma.product.findMany({
      where,
      orderBy,
      select: PRODUCT_LIST_SELECT,
    });

    // Batch-query hero images for all products
    const productIds = dbProducts.map((p) => p.id);
    const heroImages = productIds.length > 0 ? await prisma.productImage.findMany({
      where: { productId: { in: productIds }, category: "HERO" },
      distinct: ["productId"],
      select: { productId: true, url: true },
      orderBy: { sortOrder: "asc" },
    }) : [];
    const heroMap = new Map(heroImages.map((h) => [h.productId, h.url]));

    const products = dbProducts.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      category: p.category,
      source: p.source,
      status: p.status,
      pricingModel: p.pricingModel,
      categoryIcon: p.categoryIcon,
      features: p.features,
      isLocked: p.isLocked,
      linkedPersonaCount: p._count.linkedPersonas,
      heroImageUrl: heroMap.get(p.id) ?? null,
      updatedAt: p.updatedAt.toISOString(),
    }));

    const byCategory: Record<string, number> = {};
    for (const p of products) {
      const cat = p.category ?? "uncategorized";
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    }

    const responseData = { products, stats: { total: products.length, byCategory } };

    if (isUnfiltered) {
      setCache(cacheKeys.products.list(workspaceId), responseData, CACHE_TTL.OVERVIEW);
    }

    return NextResponse.json(responseData, {
      headers: isUnfiltered ? { 'X-Cache': 'MISS' } : {},
    });
  } catch (error) {
    console.error("[GET /api/products]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/products
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      name,
      description,
      category,
      pricingModel,
      pricingDetails,
      features,
      benefits,
      useCases,
      linkedPersonaIds,
      source,
      sourceUrl,
      status,
      analysisData,
      images,
    } = parsed.data;

    let slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Fallback for non-ASCII names that produce empty slugs
    if (!slug) {
      slug = `product-${Date.now()}`;
    }

    // Check for existing slug and append suffix if collision
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Determine source and status
    const resolvedSource = source ?? "MANUAL";
    const validStatuses = Object.values(ProductStatus) as string[];
    const resolvedStatus = (status && validStatuses.includes(status)
      ? status
      : resolvedSource !== "MANUAL" ? "ANALYZED" : "DRAFT") as ProductStatus;

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description ?? null,
        category: category ?? null,
        pricingModel: pricingModel ?? null,
        pricingDetails: pricingDetails ?? null,
        features: features ?? [],
        benefits: benefits ?? [],
        useCases: useCases ?? [],
        source: resolvedSource,
        sourceUrl: sourceUrl ?? null,
        status: resolvedStatus,
        analysisData: analysisData ?? undefined,
        workspaceId,
      },
    });

    // Create ProductImage records if images provided
    if (images && images.length > 0) {
      const { ProductImageCategory: PIC } = await import("@prisma/client");
      const validCategories = Object.values(PIC) as string[];
      // Derive image source from product source
      const imageSource = resolvedSource === "WEBSITE_URL" ? "SCRAPED"
        : resolvedSource === "PDF_UPLOAD" ? "SCRAPED"
        : "UPLOADED";

      await prisma.productImage.createMany({
        data: images.map((img, idx) => ({
          productId: product.id,
          url: img.url,
          category: (img.category && validCategories.includes(img.category)
            ? img.category
            : "OTHER") as (typeof PIC)[keyof typeof PIC],
          altText: img.altText ?? null,
          sortOrder: idx,
          source: imageSource,
        })),
      });
    }

    // Create ProductPersona records if linkedPersonaIds provided
    if (linkedPersonaIds && linkedPersonaIds.length > 0) {
      await prisma.productPersona.createMany({
        data: linkedPersonaIds.map((personaId) => ({
          productId: product.id,
          personaId,
        })),
        skipDuplicates: true,
      });
    }

    invalidateCache(cacheKeys.prefixes.products(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("[POST /api/products]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
