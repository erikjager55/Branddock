import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";

export async function POST(
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

    const hasAccess =
      existingInterview.asset.workspace.ownerId === user.id ||
      existingInterview.asset.workspace.members.some((m) => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Count existing interviews to generate title
    const count = await prisma.interview.count({
      where: { assetId: existingInterview.assetId, deletedAt: null },
    });

    const duplicate = await prisma.interview.create({
      data: {
        title: `${existingInterview.title ?? "Interview"} (Copy)`,
        status: "TO_SCHEDULE",
        currentStep: 1,
        contactName: existingInterview.contactName,
        contactPosition: existingInterview.contactPosition,
        contactEmail: existingInterview.contactEmail,
        contactPhone: existingInterview.contactPhone,
        contactCompany: existingInterview.contactCompany,
        duration: existingInterview.duration,
        questions: existingInterview.questions as Prisma.InputJsonValue ?? Prisma.JsonNull,
        selectedAssets: existingInterview.selectedAssets as Prisma.InputJsonValue ?? Prisma.JsonNull,
        assetId: existingInterview.assetId,
        createdById: user.id,
      },
      include: {
        asset: {
          select: { id: true, name: true, type: true, category: true },
        },
      },
    });

    return NextResponse.json(duplicate, { status: 201 });
  } catch (error) {
    console.error("Error duplicating interview:", error);
    return NextResponse.json(
      { error: "Failed to duplicate interview" },
      { status: 500 }
    );
  }
}
