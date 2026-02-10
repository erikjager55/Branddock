import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createProductSchema } from "@/lib/validations/product";
import { getAuthOrFallback } from "@/lib/auth-dev";

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthOrFallback();
    if (!authResult) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as string | null;
    const category = searchParams.get("category") as string | null;
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const workspaceId = searchParams.get("workspaceId") || authResult.workspaceId;

    const where: Prisma.ProductWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(status && { status: status as Prisma.EnumProductStatusFilter["equals"] }),
      ...(category && { category }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { personas: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({ data: products, total, limit, offset });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthOrFallback();
    if (!authResult) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const workspaceId = data.workspaceId ?? authResult.workspaceId;

    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        source: data.source,
        sourceUrl: data.sourceUrl,
        status: "DRAFT",
        analysisStatus: "DRAFT",
        pricingModel: data.pricingModel,
        pricingDetails: data.pricingDetails,
        features: (data.features || []) as Prisma.InputJsonValue,
        benefits: (data.benefits || []) as Prisma.InputJsonValue,
        useCases: (data.useCases || []) as Prisma.InputJsonValue,
        targetAudience: (data.targetAudience || []) as Prisma.InputJsonValue,
        workspaceId,
        createdById: authResult.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { personas: true } },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
