import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string; interviewId: string; questionId: string }> };

const updateQuestionSchema = z.object({
  questionText: z.string().min(1).optional(),
  answerText: z.string().optional(),
  answerOptions: z.array(z.string()).optional(),
  answerRating: z.number().min(1).max(5).optional(),
  answerRanking: z.array(z.string()).optional(),
  isAnswered: z.boolean().optional(),
});

// =============================================================
// PATCH /api/brand-assets/[id]/interviews/[interviewId]/questions/[questionId]
// Update question text or answer
// =============================================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id: assetId, interviewId, questionId } = await params;
    const body = await request.json();
    const parsed = updateQuestionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Verify ownership chain
    const interview = await prisma.interview.findFirst({
      where: { id: interviewId, brandAssetId: assetId, workspaceId },
      select: { id: true },
    });
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const question = await prisma.interviewQuestion.findFirst({
      where: { id: questionId, interviewId },
    });
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const updated = await prisma.interviewQuestion.update({
      where: { id: questionId },
      data: parsed.data,
    });

    return NextResponse.json({ question: updated });
  } catch (error) {
    console.error("[PATCH questions/:questionId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// DELETE /api/brand-assets/[id]/interviews/[interviewId]/questions/[questionId]
// Delete a question
// =============================================================
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id: assetId, interviewId, questionId } = await params;

    const interview = await prisma.interview.findFirst({
      where: { id: interviewId, brandAssetId: assetId, workspaceId },
      select: { id: true },
    });
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const question = await prisma.interviewQuestion.findFirst({
      where: { id: questionId, interviewId },
    });
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    await prisma.interviewQuestion.delete({ where: { id: questionId } });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE questions/:questionId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
