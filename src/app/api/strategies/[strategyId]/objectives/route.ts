import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ strategyId: string }> }
) {
  try {
    const { strategyId } = await params;

    const objectives = await prisma.strategicObjective.findMany({
      where: { strategyId },
      include: { keyResults: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ data: objectives });
  } catch (error) {
    console.error("Error fetching objectives:", error);
    return NextResponse.json({ error: "Failed to fetch objectives" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ strategyId: string }> }
) {
  try {
    const { strategyId } = await params;
    const body = await request.json();

    const { title, description, focusArea, priority, metricType, startValue, targetValue, currentValue, keyResults } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Get max sortOrder
    const maxSort = await prisma.strategicObjective.findFirst({
      where: { strategyId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const objective = await prisma.strategicObjective.create({
      data: {
        title,
        description,
        focusArea,
        priority: priority || "MEDIUM",
        status: "ON_TRACK",
        metricType: metricType || "PERCENTAGE",
        startValue: parseFloat(startValue) || 0,
        targetValue: parseFloat(targetValue) || 100,
        currentValue: parseFloat(currentValue) || 0,
        sortOrder: (maxSort?.sortOrder ?? -1) + 1,
        linkedCampaigns: body.linkedCampaigns as Prisma.InputJsonValue | undefined,
        strategyId,
        keyResults: keyResults?.length
          ? {
              create: keyResults
                .filter((kr: string) => kr.trim())
                .map((kr: string, i: number) => ({
                  description: kr,
                  status: "NOT_STARTED",
                  sortOrder: i,
                })),
            }
          : undefined,
      },
      include: { keyResults: true },
    });

    return NextResponse.json({ data: objective }, { status: 201 });
  } catch (error) {
    console.error("Error creating objective:", error);
    return NextResponse.json({ error: "Failed to create objective" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ strategyId: string }> }
) {
  try {
    const body = await request.json();
    const { objectiveId, ...data } = body;

    if (!objectiveId) {
      return NextResponse.json({ error: "objectiveId required" }, { status: 400 });
    }

    const updateData: Prisma.StrategicObjectiveUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.focusArea !== undefined) updateData.focusArea = data.focusArea;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.currentValue !== undefined) updateData.currentValue = parseFloat(data.currentValue);
    if (data.targetValue !== undefined) updateData.targetValue = parseFloat(data.targetValue);

    const updated = await prisma.strategicObjective.update({
      where: { id: objectiveId },
      data: updateData,
      include: { keyResults: true },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error updating objective:", error);
    return NextResponse.json({ error: "Failed to update objective" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
) {
  try {
    const { searchParams } = new URL(request.url);
    const objectiveId = searchParams.get("objectiveId");

    if (!objectiveId) {
      return NextResponse.json({ error: "objectiveId required" }, { status: 400 });
    }

    await prisma.strategicObjective.delete({ where: { id: objectiveId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting objective:", error);
    return NextResponse.json({ error: "Failed to delete objective" }, { status: 500 });
  }
}
