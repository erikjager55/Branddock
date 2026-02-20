import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { openaiClient } from "@/lib/ai/openai-client";
import { getBrandContext } from "@/lib/ai/brand-context";
import {
  buildFeedbackPrompt,
  buildAnalysisQuestionPrompt,
} from "@/lib/ai/prompts/brand-analysis";
import { parseAIError, getReadableErrorMessage, getAIErrorStatus } from "@/lib/ai/error-handler";

type RouteParams = { params: Promise<{ id: string; sessionId: string }> };

const answerSchema = z.object({
  content: z.string().min(1).max(5000),
});

// =============================================================
// POST /api/brand-assets/[id]/ai-analysis/[sessionId]/answer
// Submit user answer, get AI feedback + next question
// =============================================================
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id: brandAssetId, sessionId } = await params;
    const body = await request.json();
    const parsed = answerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Get session with messages
    const session = await prisma.aIBrandAnalysisSession.findFirst({
      where: { id: sessionId, brandAssetId, workspaceId },
      include: {
        messages: { orderBy: { orderIndex: "asc" } },
        brandAsset: { select: { name: true, category: true, description: true } },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.locked) {
      return NextResponse.json({ error: "Session is locked" }, { status: 409 });
    }

    if (session.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: `Session is ${session.status.toLowerCase()}, cannot submit answers` },
        { status: 409 },
      );
    }

    // Find the last AI question
    const lastQuestion = [...session.messages]
      .reverse()
      .find((m) => m.type === "AI_QUESTION");
    if (!lastQuestion) {
      return NextResponse.json({ error: "No pending question found" }, { status: 400 });
    }

    // Current order index
    const maxOrderIndex = Math.max(...session.messages.map((m) => m.orderIndex));

    // Get brand context
    const brandContext = await getBrandContext(workspaceId);

    // Generate feedback
    const feedbackMessages = buildFeedbackPrompt(
      lastQuestion.content,
      parsed.data.content,
      session.brandAsset.name,
      brandContext,
    );
    const feedbackText = await openaiClient.createChatCompletion(feedbackMessages, {
      useCase: "CHAT",
    });

    // Build previous Q&A pairs for context
    const previousQA: { question: string; answer: string }[] = [];
    const allMessages = session.messages;
    for (let i = 0; i < allMessages.length; i++) {
      if (allMessages[i].type === "AI_QUESTION") {
        const answer = allMessages.find(
          (m) => m.orderIndex > allMessages[i].orderIndex && m.type === "USER_ANSWER",
        );
        if (answer) {
          previousQA.push({ question: allMessages[i].content, answer: answer.content });
        }
      }
    }
    // Add current Q&A
    previousQA.push({ question: lastQuestion.content, answer: parsed.data.content });

    const newAnsweredCount = session.answeredQuestions + 1;
    const isComplete = newAnsweredCount >= session.totalQuestions;

    // Generate next question (if not complete)
    let nextQuestionText: string | null = null;
    if (!isComplete) {
      const questionMessages = buildAnalysisQuestionPrompt(
        session.brandAsset.name,
        session.brandAsset.category,
        session.brandAsset.description,
        previousQA,
        newAnsweredCount,
        brandContext,
      );
      nextQuestionText = await openaiClient.createChatCompletion(questionMessages, {
        useCase: "CHAT",
      });
    }

    // Calculate progress (can exceed 100% with extra questions)
    const progress = Math.round((newAnsweredCount / session.totalQuestions) * 100);

    // Save messages and update session in a transaction
    const newMessages = await prisma.$transaction(async (tx) => {
      // Save user answer
      const userMsg = await tx.aIAnalysisMessage.create({
        data: {
          type: "USER_ANSWER",
          content: parsed.data.content,
          orderIndex: maxOrderIndex + 1,
          sessionId,
        },
      });

      // Save AI feedback
      const feedbackMsg = await tx.aIAnalysisMessage.create({
        data: {
          type: "AI_FEEDBACK",
          content: feedbackText,
          orderIndex: maxOrderIndex + 2,
          sessionId,
        },
      });

      // Save next question if available
      let questionMsg = null;
      if (nextQuestionText) {
        questionMsg = await tx.aIAnalysisMessage.create({
          data: {
            type: "AI_QUESTION",
            content: nextQuestionText,
            orderIndex: maxOrderIndex + 3,
            sessionId,
          },
        });
      }

      // Update session
      await tx.aIBrandAnalysisSession.update({
        where: { id: sessionId },
        data: {
          answeredQuestions: newAnsweredCount,
          progress,
          lastUpdatedAt: new Date(),
        },
      });

      return { userMsg, feedbackMsg, questionMsg };
    });

    return NextResponse.json({
      feedback: feedbackText,
      nextQuestion: nextQuestionText,
      progress,
      answeredQuestions: newAnsweredCount,
      totalQuestions: session.totalQuestions,
      isComplete,
    });
  } catch (error) {
    console.error("[POST /api/brand-assets/:id/ai-analysis/:sessionId/answer]", error);
    const parsed = parseAIError(error);
    return NextResponse.json({ error: getReadableErrorMessage(parsed) }, { status: getAIErrorStatus(parsed) });
  }
}
