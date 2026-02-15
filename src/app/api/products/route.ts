import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ProductWithMeta, ProductListResponse } from "@/types/product";

// =============================================================
// GET /api/products?workspaceId=xxx&category=Software&...
// =============================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") ?? "name";
    const sortOrder = searchParams.get("sortOrder") ?? "asc";

    // Build where clause
    const where: Record<string, unknown> = { workspaceId };
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Build orderBy
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
    });

    // Map to ProductWithMeta
    const products: ProductWithMeta[] = dbProducts.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      category: p.category,
      source: p.source,
      pricingModel: p.pricingModel,
      pricingAmount: p.pricingAmount,
      pricingCurrency: p.pricingCurrency,
      features: (p.features as string[]) ?? [],
      benefits: (p.benefits as string[]) ?? [],
      useCases: (p.useCases as string[]) ?? [],
      specifications: (p.specifications as { key: string; value: string }[]) ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    // Stats
    const byCategory: Record<string, number> = {};
    for (const p of products) {
      byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
    }

    const response: ProductListResponse = {
      products,
      stats: { total: products.length, byCategory },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/products]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================
// POST /api/products
// =============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      category,
      description,
      workspaceId,
      source,
      pricingModel,
      pricingAmount,
      pricingCurrency,
      features,
      benefits,
      useCases,
      specifications,
    } = body;

    if (!name || !category || !workspaceId) {
      return NextResponse.json(
        { error: "name, category and workspaceId are required" },
        { status: 400 }
      );
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: `Product with slug "${slug}" already exists` },
        { status: 409 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description ?? "",
        category,
        source: source ?? "Manual Entry",
        pricingModel: pricingModel ?? "Custom",
        pricingAmount: pricingAmount ?? null,
        pricingCurrency: pricingCurrency ?? null,
        features: features ?? [],
        benefits: benefits ?? [],
        useCases: useCases ?? [],
        specifications: specifications ?? undefined,
        workspaceId,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("[POST /api/products]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
