import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ strategyId: string }> }
) {
  try {
    const { strategyId } = await params;

    const milestones = await prisma.strategyMilestone.findMany({
      where: { strategyId },
      orderBy: { dueDate: "asc" },
    });

    return NextResponse.json({ data: milestones });
  } catch (error) {
    console.error("Error fetching milestones:", error);
    return NextResponse.json({ error: "Failed to fetch milestones" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ strategyId: string }> }
) {
  try {
    const { strategyId } = await params;
    const body = await request.json();

    const { title, description, dueDate, quarter } = body;

    if (!title || !dueDate) {
      return NextResponse.json({ error: "Title and dueDate are required" }, { status: 400 });
    }

    const maxSort = await prisma.strategyMilestone.findFirst({
      where: { strategyId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const milestone = await prisma.strategyMilestone.create({
      data: {
        title,
        description,
        dueDate: new Date(dueDate),
        quarter,
        sortOrder: (maxSort?.sortOrder ?? -1) + 1,
        strategyId,
      },
    });

    return NextResponse.json({ data: milestone }, { status: 201 });
  } catch (error) {
    console.error("Error creating milestone:", error);
    return NextResponse.json({ error: "Failed to create milestone" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { milestoneId, completed } = body;

    if (!milestoneId) {
      return NextResponse.json({ error: "milestoneId required" }, { status: 400 });
    }

    const updated = await prisma.strategyMilestone.update({
      where: { id: milestoneId },
      data: {
        completed: completed ?? false,
        completedAt: completed ? new Date() : null,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error updating milestone:", error);
    return NextResponse.json({ error: "Failed to update milestone" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const milestoneId = searchParams.get("milestoneId");

    if (!milestoneId) {
      return NextResponse.json({ error: "milestoneId required" }, { status: 400 });
    }

    await prisma.strategyMilestone.delete({ where: { id: milestoneId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting milestone:", error);
    return NextResponse.json({ error: "Failed to delete milestone" }, { status: 500 });
  }
}
