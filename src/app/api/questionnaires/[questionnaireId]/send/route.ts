import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { randomUUID } from "crypto";

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
        { error: "Questionnaire is locked and cannot be sent" },
        { status: 403 }
      );
    }

    // Generate a shareable link (mock UUID-based link)
    const shareableLink =
      existing.shareableLink ||
      `${process.env.NEXT_PUBLIC_APP_URL || "https://app.branddock.com"}/q/${randomUUID()}`;

    // Update status to COLLECTING if currently DRAFT, and set shareable link
    const updateData: { status?: "COLLECTING"; shareableLink: string } = {
      shareableLink,
    };

    if (existing.status === "DRAFT") {
      updateData.status = "COLLECTING";
    }

    const updated = await prisma.questionnaire.update({
      where: { id: questionnaireId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      shareableLink: updated.shareableLink,
    });
  } catch (error) {
    console.error("Error sending questionnaire:", error);
    return NextResponse.json(
      { error: "Failed to send questionnaire" },
      { status: 500 }
    );
  }
}
