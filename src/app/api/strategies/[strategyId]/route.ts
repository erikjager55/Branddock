import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { updateStrategySchema } from "@/lib/validations/strategy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ strategyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { strategyId } = await params;

    const strategy = await prisma.businessStrategy.findUnique({
      where: { id: strategyId, deletedAt: null },
    });

    if (!strategy) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: strategy });
  } catch (error) {
    console.error("Error fetching strategy:", error);
    return NextResponse.json(
      { error: "Failed to fetch strategy" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ strategyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { strategyId } = await params;
    const body = await request.json();
    const parsed = updateStrategySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if strategy exists and is not soft-deleted
    const existing = await prisma.businessStrategy.findUnique({
      where: { id: strategyId, deletedAt: null },
      include: {
        workspace: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
    }

    // Verify user has access to workspace
    const hasAccess =
      existing.workspace.ownerId === user.id ||
      existing.workspace.members.some((m) => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Reject updates if locked (unless the request is to unlock)
    if (existing.isLocked && data.isLocked !== false) {
      return NextResponse.json(
        { error: "Strategy is locked. Unlock it before making changes." },
        { status: 423 }
      );
    }

    // Build update data — only include provided fields
    const updateData: Prisma.BusinessStrategyUpdateInput = {};
    if (data.type !== undefined) updateData.type = data.type;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.content !== undefined)
      updateData.content = data.content as Prisma.InputJsonValue;
    if (data.isLocked !== undefined) updateData.isLocked = data.isLocked;

    const updated = await prisma.businessStrategy.update({
      where: { id: strategyId },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error updating strategy:", error);
    return NextResponse.json(
      { error: "Failed to update strategy" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ strategyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { strategyId } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if strategy exists and is not already soft-deleted
    const existing = await prisma.businessStrategy.findUnique({
      where: { id: strategyId, deletedAt: null },
      include: {
        workspace: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
    }

    // Verify user has access (only owners and admins can delete)
    const hasAccess =
      existing.workspace.ownerId === user.id ||
      existing.workspace.members.some(
        (m) =>
          m.userId === user.id &&
          (m.role === "OWNER" || m.role === "ADMIN")
      );

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Soft delete
    await prisma.businessStrategy.update({
      where: { id: strategyId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting strategy:", error);
    return NextResponse.json(
      { error: "Failed to delete strategy" },
      { status: 500 }
    );
  }
}
