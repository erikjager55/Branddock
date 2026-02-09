import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { updateInterviewSchema } from "@/lib/validations/interview";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { interviewId } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId, deletedAt: null },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            type: true,
            category: true,
            status: true,
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    // Verify user has workspace access through the asset
    const asset = await prisma.brandAsset.findUnique({
      where: { id: interview.assetId },
      include: { workspace: { include: { members: true } } },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const hasAccess =
      asset.workspace.ownerId === user.id ||
      asset.workspace.members.some((m) => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(interview);
  } catch (error) {
    console.error("Error fetching interview:", error);
    return NextResponse.json(
      { error: "Failed to fetch interview" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { interviewId } = await params;
    const body = await request.json();
    const parsed = updateInterviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
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

    // Check if interview exists and user has access
    const existingInterview = await prisma.interview.findUnique({
      where: { id: interviewId, deletedAt: null },
      include: {
        asset: {
          include: {
            workspace: {
              include: { members: true },
            },
          },
        },
      },
    });

    if (!existingInterview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const hasAccess =
      existingInterview.asset.workspace.ownerId === user.id ||
      existingInterview.asset.workspace.members.some((m) => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Prevent editing locked interviews
    if (existingInterview.isLocked) {
      return NextResponse.json(
        { error: "Interview is locked and cannot be edited" },
        { status: 403 }
      );
    }

    // Build update data dynamically for all provided fields
    const updateData: Prisma.InterviewUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.currentStep !== undefined) updateData.currentStep = data.currentStep;
    if (data.contactName !== undefined) updateData.contactName = data.contactName;
    if (data.contactPosition !== undefined) updateData.contactPosition = data.contactPosition;
    if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
    if (data.contactCompany !== undefined) updateData.contactCompany = data.contactCompany;
    if (data.scheduledDate !== undefined) {
      updateData.scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : null;
    }
    if (data.scheduledTime !== undefined) updateData.scheduledTime = data.scheduledTime;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.questions !== undefined) updateData.questions = data.questions as Prisma.InputJsonValue ?? Prisma.JsonNull;
    if (data.selectedAssets !== undefined) updateData.selectedAssets = data.selectedAssets as Prisma.InputJsonValue ?? Prisma.JsonNull;
    if (data.answers !== undefined) updateData.answers = data.answers as Prisma.InputJsonValue ?? Prisma.JsonNull;
    if (data.generalNotes !== undefined) updateData.generalNotes = data.generalNotes;
    if (data.completionRate !== undefined) updateData.completionRate = data.completionRate;

    const updatedInterview = await prisma.interview.update({
      where: { id: interviewId },
      data: updateData,
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            type: true,
            category: true,
            status: true,
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedInterview);
  } catch (error) {
    console.error("Error updating interview:", error);
    return NextResponse.json(
      { error: "Failed to update interview" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { interviewId } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if interview exists and user has access
    const existingInterview = await prisma.interview.findUnique({
      where: { id: interviewId, deletedAt: null },
      include: {
        asset: {
          include: {
            workspace: {
              include: { members: true },
            },
          },
        },
      },
    });

    if (!existingInterview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const hasAccess =
      existingInterview.asset.workspace.ownerId === user.id ||
      existingInterview.asset.workspace.members.some((m) => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Soft delete
    await prisma.interview.update({
      where: { id: interviewId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting interview:", error);
    return NextResponse.json(
      { error: "Failed to delete interview" },
      { status: 500 }
    );
  }
}
