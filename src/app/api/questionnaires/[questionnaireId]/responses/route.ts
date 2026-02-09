import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { submitResponseSchema } from "@/lib/validations/questionnaire";

// POST: Submit a response (public endpoint - NO auth required)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ questionnaireId: string }> }
) {
  try {
    const { questionnaireId } = await params;
    const body = await request.json();
    const parsed = submitResponseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Find the questionnaire
    const questionnaire = await prisma.questionnaire.findUnique({
      where: { id: questionnaireId },
    });

    if (!questionnaire || questionnaire.deletedAt) {
      return NextResponse.json({ error: "Questionnaire not found" }, { status: 404 });
    }

    if (questionnaire.isLocked) {
      return NextResponse.json(
        { error: "Questionnaire is locked and no longer accepting responses" },
        { status: 403 }
      );
    }

    if (questionnaire.status !== "COLLECTING") {
      return NextResponse.json(
        { error: "Questionnaire is not currently collecting responses" },
        { status: 400 }
      );
    }

    // Build the new response entry
    const newResponse = {
      id: crypto.randomUUID(),
      respondentId: data.respondentId || null,
      answers: data.answers,
      completionTime: data.completionTime || null,
      submittedAt: new Date().toISOString(),
    };

    // Append to existing responses array
    const existingResponses = (questionnaire.responses as unknown[] | null) || [];
    const updatedResponses = [...existingResponses, newResponse];

    // Calculate updated metrics
    const newTotalResponses = questionnaire.totalResponses + 1;

    // Calculate response rate based on recipients count
    const recipients = (questionnaire.recipients as unknown[] | null) || [];
    const recipientCount = recipients.length;
    const newResponseRate =
      recipientCount > 0
        ? Math.round((newTotalResponses / recipientCount) * 100 * 100) / 100
        : 0;

    // Calculate updated average completion time
    let newAvgTime = questionnaire.avgTime;
    if (data.completionTime) {
      if (questionnaire.avgTime && questionnaire.totalResponses > 0) {
        // Weighted average
        newAvgTime = Math.round(
          (questionnaire.avgTime * questionnaire.totalResponses + data.completionTime) /
            newTotalResponses
        );
      } else {
        newAvgTime = data.completionTime;
      }
    }

    const updated = await prisma.questionnaire.update({
      where: { id: questionnaireId },
      data: {
        responses: updatedResponses as Prisma.InputJsonValue,
        totalResponses: newTotalResponses,
        responseRate: newResponseRate,
        avgTime: newAvgTime,
      },
    });

    return NextResponse.json(
      {
        success: true,
        responseId: newResponse.id,
        totalResponses: updated.totalResponses,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error submitting questionnaire response:", error);
    return NextResponse.json(
      { error: "Failed to submit response" },
      { status: 500 }
    );
  }
}

// GET: Get responses (requires auth)
export async function GET(
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
    const questionnaire = await prisma.questionnaire.findUnique({
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

    if (!questionnaire || questionnaire.deletedAt) {
      return NextResponse.json({ error: "Questionnaire not found" }, { status: 404 });
    }

    const hasAccess =
      questionnaire.asset.workspace.ownerId === user.id ||
      questionnaire.asset.workspace.members.some(
        (member) => member.userId === user.id
      );

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      responses: questionnaire.responses || [],
      totalResponses: questionnaire.totalResponses,
      responseRate: questionnaire.responseRate,
      completionRate: questionnaire.completionRate,
      avgTime: questionnaire.avgTime,
    });
  } catch (error) {
    console.error("Error fetching questionnaire responses:", error);
    return NextResponse.json(
      { error: "Failed to fetch responses" },
      { status: 500 }
    );
  }
}
