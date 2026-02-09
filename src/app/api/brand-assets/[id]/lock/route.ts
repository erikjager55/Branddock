import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";

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

    if (typeof body.lock !== "boolean") {
      return NextResponse.json(
        { error: "lock (boolean) is required" },
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

    // Check if asset exists and get workspace for permission check
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

    // Only ADMIN or OWNER can lock/unlock
    const isOwner = existingAsset.workspace.ownerId === user.id;
    const memberRecord = existingAsset.workspace.members.find(
      (member) => member.userId === user.id
    );
    const isAdminOrOwner =
      isOwner ||
      (memberRecord &&
        (memberRecord.role === "OWNER" || memberRecord.role === "ADMIN"));

    if (!isAdminOrOwner) {
      return NextResponse.json(
        { error: "Only ADMIN or OWNER can lock/unlock assets" },
        { status: 403 }
      );
    }

    // Apply lock or unlock
    const updatedAsset = await prisma.brandAsset.update({
      where: { id },
      data: body.lock
        ? {
            isLocked: true,
            lockedAt: new Date(),
            lockedBy: { connect: { id: user.id } },
            status: "LOCKED",
          }
        : {
            isLocked: false,
            lockedAt: null,
            lockedBy: { disconnect: true },
            status: "VALIDATED",
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

    return NextResponse.json(updatedAsset);
  } catch (error) {
    console.error("Error toggling brand asset lock:", error);
    return NextResponse.json(
      { error: "Failed to toggle brand asset lock" },
      { status: 500 }
    );
  }
}
