import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, requireAuth } from "@/lib/auth-server";
import { openaiClient } from "@/lib/ai/openai-client";
import { getBrandContext } from "@/lib/ai/brand-context";
import { buildAnalysisQuestionPrompt } from "@/lib/ai/prompts/brand-analysis";
import { parseAIError, getReadableErrorMessage, getAIErrorStatus } from "@/lib/ai/error-handler";

type RouteParams = { params: Promise<{ id: string }> };

const startSchema = z.object({
  personaId: z.string().optional(),
});

// =============================================================
// POST /api/brand-assets/[id]/ai-analysis — start new session
// Creates AIBrandAnalysisSession + intro message + first AI question
// =============================================================
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id: brandAssetId } = await params;
    const body = await request.json();
    const parsed = startSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Verify brand asset belongs to workspace
    const asset = await prisma.brandAsset.findFirst({
      where: { id: brandAssetId, workspaceId },
      select: { id: true, name: true, category: true, description: true },
    });
    if (!asset) {
      return NextResponse.json({ error: "Brand asset not found" }, { status: 404 });
    }

    // Get brand context for AI
    const brandContext = await getBrandContext(workspaceId);

    // Generate first question via OpenAI
    const questionMessages = buildAnalysisQuestionPrompt(
      asset.name,
      asset.category,
      asset.description,
      [],
      0,
      brandContext,
    );

    const firstQuestion = await openaiClient.createChatCompletion(questionMessages, {
      useCase: "CHAT",
    });

    // Create session with intro + first question
    const totalQuestions = 8;
    const analysisSession = await prisma.aIBrandAnalysisSession.create({
      data: {
        status: "IN_PROGRESS",
        progress: 0,
        totalQuestions,
        answeredQuestions: 0,
        locked: false,
        brandAssetId,
        workspaceId,
        createdById: session.user.id,
        personaId: parsed.data.personaId ?? null,
        lastUpdatedAt: new Date(),
        messages: {
          create: [
            {
              type: "SYSTEM_INTRO",
              content: `Welcome to AI Brand Analysis! I'll help you explore and validate your "${asset.name}" brand asset through a series of strategic questions. Your answers will be used to generate a comprehensive analysis report.`,
              orderIndex: 0,
            },
            {
              type: "AI_QUESTION",
              content: firstQuestion,
              orderIndex: 1,
            },
          ],
        },
      },
      include: {
        messages: { orderBy: { orderIndex: "asc" } },
      },
    });

    return NextResponse.json(
      {
        sessionId: analysisSession.id,
        status: analysisSession.status,
        messages: analysisSession.messages.map((m) => ({
          id: m.id,
          type: m.type,
          content: m.content,
          orderIndex: m.orderIndex,
          metadata: m.metadata,
          createdAt: m.createdAt.toISOString(),
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/brand-assets/:id/ai-analysis]", error);
    const parsed = parseAIError(error);
    return NextResponse.json({ error: getReadableErrorMessage(parsed) }, { status: getAIErrorStatus(parsed) });
  }
}
