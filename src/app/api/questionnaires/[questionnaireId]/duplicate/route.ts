import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ questionnaireId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionnaireId } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await prisma.questionnaire.findUnique({
      where: { id: questionnaireId, deletedAt: null },
      include: {
        asset: {
          include: {
            workspace: { include: { members: true } },
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Questionnaire not found" },
        { status: 404 }
      );
    }

    const hasAccess =
      existing.asset.workspace.ownerId === user.id ||
      existing.asset.workspace.members.some((m) => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const duplicate = await prisma.questionnaire.create({
      data: {
        name: `${existing.name} (Copy)`,
        description: existing.description,
        status: "DRAFT",
        currentStep: 1,
        questions:
          (existing.questions as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        distributionMethod: existing.distributionMethod,
        emailSubject: existing.emailSubject,
        emailBody: existing.emailBody,
        isAnonymous: existing.isAnonymous,
        allowMultiple: existing.allowMultiple,
        reminderDays: existing.reminderDays,
        assetId: existing.assetId,
        createdById: user.id,
      },
    });

    return NextResponse.json(duplicate, { status: 201 });
  } catch (error) {
    console.error("Error duplicating questionnaire:", error);
    return NextResponse.json(
      { error: "Failed to duplicate questionnaire" },
      { status: 500 }
    );
  }
}
