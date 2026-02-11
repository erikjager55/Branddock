import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";

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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingInterview = await prisma.interview.findUnique({
      where: { id: interviewId, deletedAt: null },
      include: {
        asset: {
          include: {
            workspace: { include: { members: true } },
          },
        },
      },
    });

    if (!existingInterview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    // Only ADMIN or OWNER can unlock
    const isOwner = existingInterview.asset.workspace.ownerId === user.id;
    const memberRecord = existingInterview.asset.workspace.members.find(
      (member) => member.userId === user.id
    );
    const isAdminOrOwner =
      isOwner ||
      (memberRecord &&
        (memberRecord.role === "OWNER" || memberRecord.role === "ADMIN"));

    if (!isAdminOrOwner) {
      return NextResponse.json(
        { error: "Only ADMIN or OWNER can unlock interviews" },
        { status: 403 }
      );
    }

    const updatedInterview = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        isLocked: false,
        lockedAt: null,
      },
      include: {
        asset: {
          select: { id: true, name: true, type: true, category: true },
        },
      },
    });

    return NextResponse.json(updatedInterview);
  } catch (error) {
    console.error("Error unlocking interview:", error);
    return NextResponse.json(
      { error: "Failed to unlock interview" },
      { status: 500 }
    );
  }
}
