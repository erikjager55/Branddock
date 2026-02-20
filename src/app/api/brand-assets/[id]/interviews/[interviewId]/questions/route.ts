import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string; interviewId: string }> };

const addQuestionSchema = z.object({
  linkedAssetId: z.string().optional(),
  linkedAssetName: z.string().optional(),
  questionType: z.enum(["OPEN", "MULTIPLE_CHOICE", "MULTI_SELECT", "RATING_SCALE", "RANKING"]),
  questionText: z.string().min(1),
  answerOptions: z.array(z.string()).optional(),
  savedToLibrary: z.boolean().optional(),
});

// =============================================================
// POST /api/brand-assets/[id]/interviews/[interviewId]/questions
// Add a question to the interview
// =============================================================
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id: assetId, interviewId } = await params;
    const body = await request.json();
    const parsed = addQuestionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const interview = await prisma.interview.findFirst({
      where: { id: interviewId, brandAssetId: assetId, workspaceId },
      select: { id: true, isLocked: true },
    });
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }
    if (interview.isLocked) {
      return NextResponse.json({ error: "Interview is locked" }, { status: 409 });
    }

    // Get next order index
    const maxOrder = await prisma.interviewQuestion.aggregate({
      where: { interviewId },
      _max: { orderIndex: true },
    });

    const question = await prisma.interviewQuestion.create({
      data: {
        interviewId,
        linkedAssetId: parsed.data.linkedAssetId || null,
        questionType: parsed.data.questionType,
        questionText: parsed.data.questionText,
        options: parsed.data.answerOptions ?? [],
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/brand-assets/:id/interviews/:interviewId/questions]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
