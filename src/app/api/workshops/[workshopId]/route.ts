import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { updateWorkshopSchema } from "@/lib/validations/workshop";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workshopId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workshopId } = await params;

    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            type: true,
            category: true,
            status: true,
            workspaceId: true,
          },
        },
      },
    });

    if (!workshop) {
      return NextResponse.json({ error: "Workshop not found" }, { status: 404 });
    }

    return NextResponse.json(workshop);
  } catch (error) {
    console.error("Error fetching workshop:", error);
    return NextResponse.json(
      { error: "Failed to fetch workshop" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workshopId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workshopId } = await params;
    const body = await request.json();
    const parsed = updateWorkshopSchema.safeParse(body);

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

    // Check if workshop exists and user has access
    const existing = await prisma.workshop.findUnique({
      where: { id: workshopId },
      include: {
        asset: {
          include: {
            workspace: {
              include: {
                members: true,
              },
            },
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Workshop not found" }, { status: 404 });
    }

    // Verify user has access to workspace via asset
    const hasAccess =
      existing.asset.workspace.ownerId === user.id ||
      existing.asset.workspace.members.some(
        (member) => member.userId === user.id
      );

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Build update data
    const updateData: Prisma.WorkshopUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.facilitator !== undefined) updateData.facilitator = data.facilitator;
    if (data.participantCount !== undefined) updateData.participantCount = data.participantCount;
    if (data.participants !== undefined) updateData.participants = data.participants as Prisma.InputJsonValue;
    if (data.stepResponses !== undefined) updateData.stepResponses = data.stepResponses as Prisma.InputJsonValue;
    if (data.canvas !== undefined) updateData.canvas = data.canvas as Prisma.InputJsonValue;
    if (data.notes !== undefined) updateData.notes = data.notes as Prisma.InputJsonValue;
    if (data.gallery !== undefined) updateData.gallery = data.gallery as Prisma.InputJsonValue;

    // Handle currentStep changes
    if (data.currentStep !== undefined) {
      updateData.currentStep = data.currentStep;

      // If workshop is being progressed and hasn't started yet, set startedAt
      if (!existing.startedAt && data.currentStep > 0) {
        updateData.startedAt = new Date();
        updateData.status = "IN_PROGRESS";
      }
    }

    const updated = await prisma.workshop.update({
      where: { id: workshopId },
      data: updateData,
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            type: true,
            category: true,
            status: true,
            workspaceId: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating workshop:", error);
    return NextResponse.json(
      { error: "Failed to update workshop" },
      { status: 500 }
    );
  }
}
