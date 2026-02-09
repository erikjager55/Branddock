import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { createInterviewSchema } from "@/lib/validations/interview";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assetId } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify asset exists and user has workspace access
    const asset = await prisma.brandAsset.findUnique({
      where: { id: assetId },
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

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as string | null;

    const where: Prisma.InterviewWhereInput = {
      assetId,
      deletedAt: null,
      ...(status && { status: status as Prisma.EnumInterviewStatusFilter["equals"] }),
    };

    const interviews = await prisma.interview.findMany({
      where,
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            type: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: interviews });
  } catch (error) {
    console.error("Error fetching interviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch interviews" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assetId } = await params;
    const body = await request.json();
    const parsed = createInterviewSchema.safeParse(body);

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

    // Verify asset exists and user has workspace access
    const asset = await prisma.brandAsset.findUnique({
      where: { id: assetId },
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

    // Determine initial status based on scheduling info
    const hasSchedulingInfo = data.scheduledDate && data.scheduledTime;
    const initialStatus = hasSchedulingInfo ? "SCHEDULED" : "TO_SCHEDULE";

    const interview = await prisma.interview.create({
      data: {
        title: data.title,
        status: initialStatus,
        contactName: data.contactName,
        contactPosition: data.contactPosition,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        contactCompany: data.contactCompany,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        scheduledTime: data.scheduledTime,
        duration: data.duration,
        questions: data.questions as Prisma.InputJsonValue ?? Prisma.JsonNull,
        selectedAssets: data.selectedAssets as Prisma.InputJsonValue ?? Prisma.JsonNull,
        assetId,
        createdById: user.id,
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            type: true,
            category: true,
          },
        },
      },
    });

    return NextResponse.json(interview, { status: 201 });
  } catch (error) {
    console.error("Error creating interview:", error);
    return NextResponse.json(
      { error: "Failed to create interview" },
      { status: 500 }
    );
  }
}
