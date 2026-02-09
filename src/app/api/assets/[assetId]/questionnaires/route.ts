import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { createQuestionnaireSchema } from "@/lib/validations/questionnaire";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assetId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    // Verify asset exists
    const asset = await prisma.brandAsset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Build where clause
    const where: Prisma.QuestionnaireWhereInput = {
      assetId,
      deletedAt: null,
      ...(status && { status: status as Prisma.EnumQuestionnaireStatusFilter }),
    };

    const questionnaires = await prisma.questionnaire.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(questionnaires);
  } catch (error) {
    console.error("Error fetching questionnaires:", error);
    return NextResponse.json(
      { error: "Failed to fetch questionnaires" },
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
    const parsed = createQuestionnaireSchema.safeParse(body);

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

    // Verify asset exists and user has access
    const asset = await prisma.brandAsset.findUnique({
      where: { id: assetId },
      include: {
        workspace: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const hasAccess =
      asset.workspace.ownerId === user.id ||
      asset.workspace.members.some((member) => member.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const questionnaire = await prisma.questionnaire.create({
      data: {
        name: data.name,
        description: data.description,
        questions: (data.questions || []) as Prisma.InputJsonValue,
        distributionMethod: data.distributionMethod,
        emailSubject: data.emailSubject,
        emailBody: data.emailBody,
        isAnonymous: data.isAnonymous,
        allowMultiple: data.allowMultiple,
        reminderDays: data.reminderDays,
        assetId,
        createdById: user.id,
      },
    });

    return NextResponse.json(questionnaire, { status: 201 });
  } catch (error) {
    console.error("Error creating questionnaire:", error);
    return NextResponse.json(
      { error: "Failed to create questionnaire" },
      { status: 500 }
    );
  }
}
