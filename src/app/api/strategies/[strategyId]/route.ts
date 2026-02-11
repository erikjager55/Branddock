import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { updateStrategySchema } from "@/lib/validations/strategy";
import { getAuthOrFallback } from "@/lib/auth-dev";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ strategyId: string }> }
) {
  try {

    const { strategyId } = await params;

    const strategy = await prisma.businessStrategy.findUnique({
      where: { id: strategyId, deletedAt: null },
      include: {
        objectives: {
          include: { keyResults: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
        milestones: { orderBy: { dueDate: "asc" } },
      },
    });

    if (!strategy) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(strategy);
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

    // Check if strategy exists and is not soft-deleted
    const existing = await prisma.businessStrategy.findUnique({
      where: { id: strategyId, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
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
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.content !== undefined) updateData.content = data.content as Prisma.InputJsonValue;
    if (data.isLocked !== undefined) updateData.isLocked = data.isLocked;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.vision !== undefined) updateData.vision = data.vision;
    if (data.rationale !== undefined) updateData.rationale = data.rationale;
    if (data.assumptions !== undefined) updateData.assumptions = data.assumptions as Prisma.InputJsonValue;
    if (data.focusAreas !== undefined) updateData.focusAreas = data.focusAreas as Prisma.InputJsonValue;

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
    const { strategyId } = await params;

    // Check if strategy exists and is not already soft-deleted
    const existing = await prisma.businessStrategy.findUnique({
      where: { id: strategyId, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
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
