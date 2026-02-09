import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { z } from "zod";

const completeWorkshopSchema = z.object({
  aiReport: z.record(z.string(), z.unknown()).optional().nullable(),
});

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
    const parsed = completeWorkshopSchema.safeParse(body);

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

    // Prevent completing an already completed workshop
    if (existing.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Workshop is already completed" },
        { status: 400 }
      );
    }

    // Calculate duration in seconds from startedAt
    const now = new Date();
    let duration: number | null = null;
    if (existing.startedAt) {
      duration = Math.round((now.getTime() - existing.startedAt.getTime()) / 1000);
    }

    // Build update data
    const updateData: Prisma.WorkshopUpdateInput = {
      status: "COMPLETED",
      completedAt: now,
      currentStep: existing.totalSteps,
      duration,
    };

    if (data.aiReport !== undefined) {
      updateData.aiReport = data.aiReport as Prisma.InputJsonValue;
    }

    // If the workshop never had startedAt set, set it now
    if (!existing.startedAt) {
      updateData.startedAt = now;
      updateData.duration = 0;
    }

    const completed = await prisma.workshop.update({
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

    return NextResponse.json(completed);
  } catch (error) {
    console.error("Error completing workshop:", error);
    return NextResponse.json(
      { error: "Failed to complete workshop" },
      { status: 500 }
    );
  }
}
