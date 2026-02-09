import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { UpdateAssetRequest } from "@/types/brand-asset";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
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
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body: UpdateAssetRequest = await request.json();

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

    // Update the asset
    const updatedAsset = await prisma.brandAsset.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.type && { type: body.type }),
        ...(body.status && { status: body.status }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.fileUrl !== undefined && { fileUrl: body.fileUrl }),
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
    const session = await getServerSession();
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
