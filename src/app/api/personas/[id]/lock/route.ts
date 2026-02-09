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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if persona exists and get workspace for permission check
    const existing = await prisma.persona.findUnique({
      where: { id, deletedAt: null },
      include: {
        workspace: {
          include: { members: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // Only ADMIN or OWNER can lock/unlock
    const isOwner = existing.workspace.ownerId === user.id;
    const memberRecord = existing.workspace.members.find(
      (member) => member.userId === user.id
    );
    const isAdminOrOwner =
      isOwner ||
      (memberRecord &&
        (memberRecord.role === "OWNER" || memberRecord.role === "ADMIN"));

    if (!isAdminOrOwner) {
      return NextResponse.json(
        { error: "Only ADMIN or OWNER can lock/unlock personas" },
        { status: 403 }
      );
    }

    const updated = await prisma.persona.update({
      where: { id },
      data: {
        isLocked: body.lock,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error toggling persona lock:", error);
    return NextResponse.json(
      { error: "Failed to toggle persona lock" },
      { status: 500 }
    );
  }
}
