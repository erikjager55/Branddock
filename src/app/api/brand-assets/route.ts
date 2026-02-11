import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createBrandAssetSchema } from "@/lib/validations/brand-asset";
import {
  AssetType,
  AssetStatus,
  AssetCategory,
  ListAssetsResponse,
} from "@/types/brand-asset";
import { getAuthOrFallback } from "@/lib/auth-dev";

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthOrFallback();
    if (!authResult) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") as AssetType | null;
    const category = searchParams.get("category") as AssetCategory | null;
    const status = searchParams.get("status") as AssetStatus | null;
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const workspaceId = searchParams.get("workspaceId") || authResult.workspaceId;

    // Build where clause
    const where: Prisma.BrandAssetWhereInput = {
      workspaceId,
      ...(type && { type }),
      ...(category && { category }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    // Fetch assets with relations
    const [assets, total] = await Promise.all([
      prisma.brandAsset.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
          lockedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          aiAnalyses: true,
          _count: {
            select: {
              newAiAnalyses: true,
              workshops: true,
              interviews: true,
              questionnaires: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.brandAsset.count({ where }),
    ]);

    return NextResponse.json({ data: assets, total, limit, offset });
  } catch (error) {
    console.error("Error fetching brand assets:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand assets" },
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
    const parsed = createBrandAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const workspaceId = data.workspaceId || authResult.workspaceId;

    // Create the asset
    const asset = await prisma.brandAsset.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        category: data.category,
        status: data.status,
        content: (data.content || {}) as Prisma.InputJsonValue,
        fileUrl: data.fileUrl,
        workspaceId,
        createdBy: authResult.user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        lockedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        aiAnalyses: true,
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error("Error creating brand asset:", error);
    return NextResponse.json(
      { error: "Failed to create brand asset" },
      { status: 500 }
    );
  }
}
