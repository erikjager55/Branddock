import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";

const DIMENSION_QUESTIONS: { key: string; title: string; icon: string; question: string }[] = [
  {
    key: "demographics",
    title: "Demographics Profile",
    icon: "Users",
    question: "Let's start with the demographics dimension. Can you tell me more about this persona's background — their typical age range, location, education, and professional context? What defines their lifestyle and daily environment?",
  },
  {
    key: "goals_motivations",
    title: "Goals & Motivations",
    icon: "TrendingUp",
    question: "Now let's explore goals and motivations. What are this persona's primary objectives — both professional and personal? What drives them to take action, and what does success look like for them?",
  },
  {
    key: "challenges_frustrations",
    title: "Challenges & Pain Points",
    icon: "Heart",
    question: "Let's discuss challenges and frustrations. What are the main obstacles this persona faces? What keeps them up at night, and what pain points do they experience with current solutions?",
  },
  {
    key: "value_proposition",
    title: "Value Alignment",
    icon: "Zap",
    question: "Finally, let's look at value alignment. How does your brand's offering connect with this persona's needs? What unique value does your product or service bring to their world?",
  },
];

// POST /api/personas/[id]/ai-analysis — start analysis session
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const persona = await prisma.persona.findFirst({
      where: { id, workspaceId },
    });
    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const introContent = `Welcome to the AI Persona Analysis for **${persona.name}**${persona.tagline ? ` — ${persona.tagline}` : ""}. I'll guide you through 4 key dimensions to build a comprehensive understanding of this persona. Let's begin!`;

    const firstQuestion = DIMENSION_QUESTIONS[0];

    const analysisSession = await prisma.aIPersonaAnalysisSession.create({
      data: {
        status: "IN_PROGRESS",
        progress: 0,
        totalDimensions: 4,
        answeredDimensions: 0,
        personaId: id,
        workspaceId,
        createdById: session.user.id,
        messages: {
          create: [
            {
              type: "SYSTEM_INTRO",
              content: introContent,
              orderIndex: 0,
            },
            {
              type: "AI_QUESTION",
              content: firstQuestion.question,
              orderIndex: 1,
              metadata: { dimensionKey: firstQuestion.key, dimensionTitle: firstQuestion.title },
            },
          ],
        },
      },
      include: {
        messages: { orderBy: { orderIndex: "asc" } },
      },
    });

    return NextResponse.json({
      sessionId: analysisSession.id,
      status: analysisSession.status,
      progress: analysisSession.progress,
      totalDimensions: analysisSession.totalDimensions,
      answeredDimensions: analysisSession.answeredDimensions,
      messages: analysisSession.messages.map((m) => ({
        id: m.id,
        type: m.type,
        content: m.content,
        orderIndex: m.orderIndex,
        metadata: m.metadata,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[POST /api/personas/:id/ai-analysis]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
