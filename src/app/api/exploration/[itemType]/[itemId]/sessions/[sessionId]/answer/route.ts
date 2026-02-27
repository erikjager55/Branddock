import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { z } from 'zod';
import { getItemTypeConfig } from '@/lib/ai/exploration/item-type-registry';
import { resolveExplorationConfig } from '@/lib/ai/exploration/config-resolver';
import { buildBrandContextString, resolveTemplate } from '@/lib/ai/exploration/prompt-engine';
import { generateAIResponse } from '@/lib/ai/exploration/ai-caller';

const answerSchema = z.object({
  content: z.string().min(1).max(5000),
});

// ─── POST /api/exploration/[itemType]/[itemId]/sessions/[sessionId]/answer ──
export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      itemType: string;
      itemId: string;
      sessionId: string;
    }>;
  },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const { itemType, itemId, sessionId } = await params;

    const config = getItemTypeConfig(itemType);
    if (!config) {
      return NextResponse.json(
        { error: `Item type "${itemType}" not supported` },
        { status: 501 },
      );
    }

    const analysisSession = await prisma.explorationSession.findFirst({
      where: { id: sessionId, workspaceId },
      include: { messages: { orderBy: { orderIndex: 'desc' }, take: 1 } },
    });

    if (!analysisSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (analysisSession.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Analysis already completed' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = answerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const content = parsed.data.content;
    const lastOrderIndex = analysisSession.messages[0]?.orderIndex ?? 0;
    const currentDimension = analysisSession.answeredDimensions;

    // Fetch item + resolve config-driven dimensions
    const item = await config.fetchItem(itemId, workspaceId);
    const slug = (item as Record<string, unknown> | null)?.slug as string | undefined ?? null;
    const explorationConfig = await resolveExplorationConfig(workspaceId, itemType, slug);
    const dimensions = explorationConfig.dimensions;
    const dimensionInfo = dimensions[currentDimension];

    // Save user answer
    await prisma.explorationMessage.create({
      data: {
        sessionId,
        type: 'USER_ANSWER',
        content,
        orderIndex: lastOrderIndex + 1,
        metadata: { dimensionKey: dimensionInfo?.key },
      },
    });

    // Build previousQA from all messages
    const allMessages = await prisma.explorationMessage.findMany({
      where: { sessionId },
      orderBy: { orderIndex: 'asc' },
    });

    const previousQA: { question: string; answer: string; dimensionKey: string }[] = [];
    let lastQuestion: { content: string; dimensionKey: string } | null = null;

    for (const msg of allMessages) {
      if (msg.type === 'AI_QUESTION') {
        const meta = msg.metadata as { dimensionKey?: string } | null;
        lastQuestion = { content: msg.content, dimensionKey: meta?.dimensionKey ?? '' };
      } else if (msg.type === 'USER_ANSWER' && lastQuestion) {
        previousQA.push({
          question: lastQuestion.content,
          answer: msg.content,
          dimensionKey: lastQuestion.dimensionKey,
        });
        lastQuestion = null;
      }
    }

    // Find the current question message for feedback context
    const currentQuestionMsg = [...allMessages].reverse().find((m) => m.type === 'AI_QUESTION');
    const currentDimensionMeta = currentQuestionMsg?.metadata as { dimensionKey?: string; dimensionTitle?: string } | null;

    // Generate feedback via config-driven AI
    const brandContext = await buildBrandContextString(workspaceId);

    const feedbackSystemPrompt = resolveTemplate(explorationConfig.systemPrompt, {
      itemName: ((item as Record<string, unknown> | null)?.name as string) ?? 'Unknown',
      itemType,
      brandContext,
      customKnowledge: explorationConfig.customKnowledge,
    });

    const feedbackUserPrompt = resolveTemplate(explorationConfig.feedbackPrompt, {
      itemName: ((item as Record<string, unknown> | null)?.name as string) ?? 'Unknown',
      itemType,
      dimensionTitle: currentDimensionMeta?.dimensionTitle ?? dimensionInfo?.title ?? 'this dimension',
      questionAsked: currentQuestionMsg?.content ?? '',
      userAnswer: content,
      brandContext,
      customKnowledge: explorationConfig.customKnowledge,
    });

    let feedbackContent: string;
    try {
      feedbackContent = await generateAIResponse(
        explorationConfig.provider,
        explorationConfig.model,
        feedbackSystemPrompt,
        feedbackUserPrompt,
        explorationConfig.temperature,
        512,
      );
    } catch (err) {
      console.warn('[exploration-feedback] AI call failed, using fallback:', err);
      feedbackContent = `Bedankt voor je inzicht over ${dimensionInfo?.title ?? 'deze dimensie'}. Dit helpt bij de analyse.`;
    }

    await prisma.explorationMessage.create({
      data: {
        sessionId,
        type: 'AI_FEEDBACK',
        content: feedbackContent,
        orderIndex: lastOrderIndex + 2,
        metadata: { dimensionKey: dimensionInfo?.key },
      },
    });

    const newAnsweredDimensions = currentDimension + 1;
    const totalDimensions = dimensions.length;
    const newProgress = Math.round((newAnsweredDimensions / totalDimensions) * 100);
    const isComplete = newAnsweredDimensions >= totalDimensions;

    let nextQuestion: {
      content: string;
      dimensionKey: string;
      dimensionTitle: string;
    } | null = null;

    // If not complete, use the next question from config dimensions
    if (!isComplete) {
      const nextDim = dimensions[newAnsweredDimensions];
      const nextQuestionContent = nextDim.question;

      await prisma.explorationMessage.create({
        data: {
          sessionId,
          type: 'AI_QUESTION',
          content: nextQuestionContent,
          orderIndex: lastOrderIndex + 3,
          metadata: {
            dimensionKey: nextDim.key,
            dimensionTitle: nextDim.title,
          },
        },
      });
      nextQuestion = {
        content: nextQuestionContent,
        dimensionKey: nextDim.key,
        dimensionTitle: nextDim.title,
      };
    }

    // Update session progress
    await prisma.explorationSession.update({
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
    console.error('[POST /api/exploration/.../answer] Full error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' ? {
          debug: error instanceof Error ? error.message : String(error),
        } : {}),
      },
      { status: 500 },
    );
  }
}
