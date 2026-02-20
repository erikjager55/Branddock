import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";

const DIMENSION_QUESTIONS: { key: string; title: string; icon: string; question: string }[] = [
  {
    key: "demographics",
    title: "Demographics Profile",
    icon: "Users",
    question: "Let's start with the demographics dimension. Can you tell me more about this persona's background — their typical age range, location, education, and professional context?",
  },
  {
    key: "goals_motivations",
    title: "Goals & Motivations",
    icon: "TrendingUp",
    question: "Now let's explore goals and motivations. What are this persona's primary objectives — both professional and personal? What drives them to take action?",
  },
  {
    key: "challenges_frustrations",
    title: "Challenges & Pain Points",
    icon: "Heart",
    question: "Let's discuss challenges and frustrations. What are the main obstacles this persona faces? What pain points do they experience with current solutions?",
  },
  {
    key: "value_proposition",
    title: "Value Alignment",
    icon: "Zap",
    question: "Finally, let's look at value alignment. How does your brand's offering connect with this persona's needs? What unique value does your product or service bring?",
  },
];

const answerSchema = z.object({
  content: z.string().min(1).max(5000),
});

// POST /api/personas/[id]/ai-analysis/[sessionId]/answer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, sessionId } = await params;

    const analysisSession = await prisma.aIPersonaAnalysisSession.findFirst({
      where: { id: sessionId, personaId: id, workspaceId },
      include: { messages: { orderBy: { orderIndex: "desc" }, take: 1 } },
    });

    if (!analysisSession) {
      return NextResponse.json({ error: "Analysis session not found" }, { status: 404 });
    }

    if (analysisSession.status === "COMPLETED") {
      return NextResponse.json({ error: "Analysis already completed" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = answerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const lastOrderIndex = analysisSession.messages[0]?.orderIndex ?? 0;
    const currentDimension = analysisSession.answeredDimensions;
    const dimensionInfo = DIMENSION_QUESTIONS[currentDimension];

    // Save user answer
    await prisma.aIPersonaAnalysisMessage.create({
      data: {
        sessionId,
        type: "USER_ANSWER",
        content: parsed.data.content,
        orderIndex: lastOrderIndex + 1,
        metadata: { dimensionKey: dimensionInfo?.key },
      },
    });

    // Generate feedback
    const feedbackContent = `Thank you for that insight about ${dimensionInfo?.title ?? "this dimension"}. Your response provides valuable context for understanding this persona's ${dimensionInfo?.key?.replace("_", " ") ?? "profile"}.`;

    await prisma.aIPersonaAnalysisMessage.create({
      data: {
        sessionId,
        type: "AI_FEEDBACK",
        content: feedbackContent,
        orderIndex: lastOrderIndex + 2,
        metadata: { dimensionKey: dimensionInfo?.key },
      },
    });

    const newAnsweredDimensions = currentDimension + 1;
    const newProgress = Math.round((newAnsweredDimensions / 4) * 100);
    const isComplete = newAnsweredDimensions >= 4;

    let nextQuestion: { content: string; dimensionKey: string; dimensionTitle: string } | null = null;

    // If not complete, add next question
    if (!isComplete) {
      const nextDim = DIMENSION_QUESTIONS[newAnsweredDimensions];
      await prisma.aIPersonaAnalysisMessage.create({
        data: {
          sessionId,
          type: "AI_QUESTION",
          content: nextDim.question,
          orderIndex: lastOrderIndex + 3,
          metadata: { dimensionKey: nextDim.key, dimensionTitle: nextDim.title },
        },
      });
      nextQuestion = {
        content: nextDim.question,
        dimensionKey: nextDim.key,
        dimensionTitle: nextDim.title,
      };
    }

    // Update session progress
    await prisma.aIPersonaAnalysisSession.update({
      where: { id: sessionId },
      data: {
        answeredDimensions: newAnsweredDimensions,
        progress: newProgress,
      },
    });

    return NextResponse.json({
      feedback: feedbackContent,
      nextQuestion,
      progress: newProgress,
      answeredDimensions: newAnsweredDimensions,
      isComplete,
    });
  } catch (error) {
    console.error("[POST /api/personas/:id/ai-analysis/:sessionId/answer]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
