import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { updateBrandAssetSchema } from "@/lib/validations/brand-asset";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const asset = await prisma.brandAsset.findUnique({
      where: { id },
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
        aiAnalyses: {
          orderBy: { createdAt: "desc" },
        },
        relatedFrom: {
          include: {
            toAsset: true,
          },
        },
        relatedTo: {
          include: {
            fromAsset: true,
          },
        },
        _count: {
          select: {
            workshops: true,
            interviews: true,
            questionnaires: true,
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error("Error fetching brand asset:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand asset" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateBrandAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Get user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if asset exists and user has access
    const existingAsset = await prisma.brandAsset.findUnique({
      where: { id },
      include: {
        workspace: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!existingAsset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Verify user has access to workspace
    const hasAccess =
      existingAsset.workspace.ownerId === user.id ||
      existingAsset.workspace.members.some(
        (member) => member.userId === user.id
      );

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Build update data
    const updateData: Prisma.BrandAssetUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.content !== undefined) updateData.content = data.content as Prisma.InputJsonValue;
    if (data.fileUrl !== undefined) updateData.fileUrl = data.fileUrl;
    if (data.validationScore !== undefined) updateData.validationScore = data.validationScore;
    if (data.lockedById !== undefined) {
      if (data.lockedById === null) {
        updateData.lockedBy = { disconnect: true };
      } else {
        updateData.lockedBy = { connect: { id: data.lockedById } };
      }
    }

    const updatedAsset = await prisma.brandAsset.update({
      where: { id },
      data: updateData,
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
            workshops: true,
            interviews: true,
            questionnaires: true,
          },
        },
      },
    });

    return NextResponse.json(updatedAsset);
  } catch (error) {
    console.error("Error updating brand asset:", error);
    return NextResponse.json(
      { error: "Failed to update brand asset" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if asset exists and user has access
    const existingAsset = await prisma.brandAsset.findUnique({
      where: { id },
      include: {
        workspace: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!existingAsset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Verify user has access to workspace (only owners and admins can delete)
    const hasAccess =
      existingAsset.workspace.ownerId === user.id ||
      existingAsset.workspace.members.some(
        (member) =>
          member.userId === user.id &&
          (member.role === "OWNER" || member.role === "ADMIN")
      );

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Delete the asset (cascades to relations and AI analyses)
    await prisma.brandAsset.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting brand asset:", error);
    return NextResponse.json(
      { error: "Failed to delete brand asset" },
      { status: 500 }
    );
  }
}
