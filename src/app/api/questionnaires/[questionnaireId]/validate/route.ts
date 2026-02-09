import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";

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

    // Only ADMIN or OWNER can validate
    const isOwner = existing.asset.workspace.ownerId === user.id;
    const memberRecord = existing.asset.workspace.members.find(
      (member) => member.userId === user.id
    );
    const isAdminOrOwner =
      isOwner ||
      (memberRecord &&
        (memberRecord.role === "OWNER" || memberRecord.role === "ADMIN"));

    if (!isAdminOrOwner) {
      return NextResponse.json(
        { error: "Only ADMIN or OWNER can validate questionnaires" },
        { status: 403 }
      );
    }

    if (existing.isValidated) {
      return NextResponse.json(
        { error: "Questionnaire is already validated" },
        { status: 400 }
      );
    }

    const updated = await prisma.questionnaire.update({
      where: { id: questionnaireId },
      data: {
        isValidated: true,
        isLocked: true,
        validatedAt: new Date(),
        status: "VALIDATED",
      },
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
    console.error("Error validating questionnaire:", error);
    return NextResponse.json(
      { error: "Failed to validate questionnaire" },
      { status: 500 }
    );
  }
}
