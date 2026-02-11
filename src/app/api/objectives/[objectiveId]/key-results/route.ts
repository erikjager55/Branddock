import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ objectiveId: string }> }
) {
  try {
    const { objectiveId } = await params;
    const body = await request.json();

    const { description, targetValue } = body;

    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    const maxSort = await prisma.keyResult.findFirst({
      where: { objectiveId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const keyResult = await prisma.keyResult.create({
      data: {
        description,
        targetValue,
        status: "NOT_STARTED",
        sortOrder: (maxSort?.sortOrder ?? -1) + 1,
        objectiveId,
      },
    });

    return NextResponse.json({ data: keyResult }, { status: 201 });
  } catch (error) {
    console.error("Error creating key result:", error);
    return NextResponse.json({ error: "Failed to create key result" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyResultId, currentValue, status } = body;

    if (!keyResultId) {
      return NextResponse.json({ error: "keyResultId required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (currentValue !== undefined) updateData.currentValue = currentValue;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.keyResult.update({
      where: { id: keyResultId },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error updating key result:", error);
    return NextResponse.json({ error: "Failed to update key result" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyResultId = searchParams.get("keyResultId");

    if (!keyResultId) {
      return NextResponse.json({ error: "keyResultId required" }, { status: 400 });
    }

    await prisma.keyResult.delete({ where: { id: keyResultId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting key result:", error);
    return NextResponse.json({ error: "Failed to delete key result" }, { status: 500 });
  }
}
