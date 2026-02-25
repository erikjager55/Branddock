import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { z } from 'zod';
import { getItemTypeConfig } from '@/lib/ai/exploration/item-type-registry';

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

    const analysisSession = await prisma.aIPersonaAnalysisSession.findFirst({
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

    const lastOrderIndex = analysisSession.messages[0]?.orderIndex ?? 0;
    const currentDimension = analysisSession.answeredDimensions;
    const dimensions = config.getDimensions();
    const dimensionInfo = dimensions[currentDimension];

    // Save user answer
    await prisma.aIPersonaAnalysisMessage.create({
      data: {
        sessionId,
        type: 'USER_ANSWER',
        content: parsed.data.content,
        orderIndex: lastOrderIndex + 1,
        metadata: { dimensionKey: dimensionInfo?.key },
      },
    });

    // Generate feedback
    const feedbackContent = `Thank you for that insight about ${dimensionInfo?.title ?? 'this dimension'}. Your response provides valuable context for the analysis.`;

    await prisma.aIPersonaAnalysisMessage.create({
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

    // If not complete, add next question
    if (!isComplete) {
      const nextDim = dimensions[newAnsweredDimensions];
      await prisma.aIPersonaAnalysisMessage.create({
        data: {
          sessionId,
          type: 'AI_QUESTION',
          content: nextDim.question,
          orderIndex: lastOrderIndex + 3,
          metadata: {
            dimensionKey: nextDim.key,
            dimensionTitle: nextDim.title,
          },
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
    console.error('[POST /api/exploration/.../answer]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
