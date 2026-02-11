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

    // Only ADMIN or OWNER can unlock
    const isOwner = existing.asset.workspace.ownerId === user.id;
    const isAdmin = existing.asset.workspace.members.some(
      (m) =>
        m.userId === user.id &&
        (m.role === "OWNER" || m.role === "ADMIN")
    );

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Only admins can unlock questionnaires" },
        { status: 403 }
      );
    }

    const updated = await prisma.questionnaire.update({
      where: { id: questionnaireId },
      data: {
        isLocked: false,
        isValidated: false,
        validatedAt: null,
        status: "ANALYZED",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error unlocking questionnaire:", error);
    return NextResponse.json(
      { error: "Failed to unlock questionnaire" },
      { status: 500 }
    );
  }
}
