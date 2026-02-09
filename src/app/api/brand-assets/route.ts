import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import {
  AssetType,
  AssetStatus,
  CreateAssetRequest,
  ListAssetsResponse,
} from "@/types/brand-asset";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspaceId");
    const type = searchParams.get("type") as AssetType | null;
    const status = searchParams.get("status") as AssetStatus | null;
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    // Build where clause
    const where: any = {
      workspaceId,
    };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

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
          aiAnalyses: true,
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.brandAsset.count({ where }),
    ]);

    const response: ListAssetsResponse = {
      assets,
      total,
      limit,
      offset,
    };

    return NextResponse.json(response);
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
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CreateAssetRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.type || !body.workspaceId) {
      return NextResponse.json(
        { error: "name, type, and workspaceId are required" },
        { status: 400 }
      );
    }

    // Get user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify user has access to workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: body.workspaceId,
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 403 }
      );
    }

    // Create the asset
    const asset = await prisma.brandAsset.create({
      data: {
        name: body.name,
        description: body.description,
        type: body.type,
        status: body.status || AssetStatus.DRAFT,
        content: body.content || {},
        fileUrl: body.fileUrl,
        workspaceId: body.workspaceId,
        createdBy: user.id,
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
