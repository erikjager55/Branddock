import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { updateQuestionnaireSchema } from "@/lib/validations/questionnaire";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ questionnaireId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionnaireId } = await params;

    const questionnaire = await prisma.questionnaire.findUnique({
      where: { id: questionnaireId },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
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

    if (!questionnaire || questionnaire.deletedAt) {
      return NextResponse.json({ error: "Questionnaire not found" }, { status: 404 });
    }

    return NextResponse.json(questionnaire);
  } catch (error) {
    console.error("Error fetching questionnaire:", error);
    return NextResponse.json(
      { error: "Failed to fetch questionnaire" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ questionnaireId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionnaireId } = await params;
    const body = await request.json();
    const parsed = updateQuestionnaireSchema.safeParse(body);

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

    // Check questionnaire exists and user has access
    const existing = await prisma.questionnaire.findUnique({
      where: { id: questionnaireId },
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

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "Questionnaire not found" }, { status: 404 });
    }

    const hasAccess =
      existing.asset.workspace.ownerId === user.id ||
      existing.asset.workspace.members.some((member) => member.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (existing.isLocked) {
      return NextResponse.json(
        { error: "Questionnaire is locked and cannot be edited" },
        { status: 403 }
      );
    }

    // Build update data dynamically
    const updateData: Prisma.QuestionnaireUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.currentStep !== undefined) updateData.currentStep = data.currentStep;
    if (data.questions !== undefined) updateData.questions = data.questions as Prisma.InputJsonValue;
    if (data.distributionMethod !== undefined) updateData.distributionMethod = data.distributionMethod;
    if (data.emailSubject !== undefined) updateData.emailSubject = data.emailSubject;
    if (data.emailBody !== undefined) updateData.emailBody = data.emailBody;
    if (data.isAnonymous !== undefined) updateData.isAnonymous = data.isAnonymous;
    if (data.allowMultiple !== undefined) updateData.allowMultiple = data.allowMultiple;
    if (data.reminderDays !== undefined) updateData.reminderDays = data.reminderDays;
    if (data.recipients !== undefined) updateData.recipients = data.recipients as Prisma.InputJsonValue;

    const updated = await prisma.questionnaire.update({
      where: { id: questionnaireId },
      data: updateData,
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            category: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating questionnaire:", error);
    return NextResponse.json(
      { error: "Failed to update questionnaire" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ questionnaireId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionnaireId } = await params;

    // Get user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check questionnaire exists and user has access
    const existing = await prisma.questionnaire.findUnique({
      where: { id: questionnaireId },
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

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "Questionnaire not found" }, { status: 404 });
    }

    const hasAccess =
      existing.asset.workspace.ownerId === user.id ||
      existing.asset.workspace.members.some(
        (member) =>
          member.userId === user.id &&
          (member.role === "OWNER" || member.role === "ADMIN")
      );

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Soft delete
    await prisma.questionnaire.update({
      where: { id: questionnaireId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting questionnaire:", error);
    return NextResponse.json(
      { error: "Failed to delete questionnaire" },
      { status: 500 }
    );
  }
}
