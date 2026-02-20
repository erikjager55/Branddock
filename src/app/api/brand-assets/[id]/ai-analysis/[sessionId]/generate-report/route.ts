import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { openaiClient } from "@/lib/ai/openai-client";
import { getBrandContext } from "@/lib/ai/brand-context";
import { buildReportPrompt } from "@/lib/ai/prompts/brand-analysis";
import { parseAIError, getReadableErrorMessage, getAIErrorStatus } from "@/lib/ai/error-handler";
import type { AIAnalysisReportData } from "@/types/ai-analysis";

type RouteParams = { params: Promise<{ id: string; sessionId: string }> };

// =============================================================
// POST /api/brand-assets/[id]/ai-analysis/[sessionId]/generate-report
// Generate analysis report using all messages + brand context
// =============================================================
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id: brandAssetId, sessionId } = await params;

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

    if (session.status !== "COMPLETED" && session.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: `Cannot generate report for session with status ${session.status.toLowerCase()}` },
        { status: 409 },
      );
    }

    // Mark as generating
    await prisma.aIBrandAnalysisSession.update({
      where: { id: sessionId },
      data: { status: "REPORT_GENERATING", lastUpdatedAt: new Date() },
    });

    // Extract Q&A pairs
    const questionsAndAnswers: { question: string; answer: string }[] = [];
    const messages = session.messages;
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].type === "AI_QUESTION") {
        const answer = messages.find(
          (m) => m.orderIndex > messages[i].orderIndex && m.type === "USER_ANSWER",
        );
        if (answer) {
          questionsAndAnswers.push({
            question: messages[i].content,
            answer: answer.content,
          });
        }
      }
    }

    // Get brand context
    const brandContext = await getBrandContext(workspaceId);

    // Generate report via OpenAI
    const reportMessages = buildReportPrompt(
      session.brandAsset.name,
      session.brandAsset.category,
      session.brandAsset.description,
      questionsAndAnswers,
      brandContext,
    );

    const reportData = await openaiClient.createStructuredCompletion<AIAnalysisReportData>(
      reportMessages,
      { useCase: "STRUCTURED", maxTokens: 4096 },
    );

    // Enrich with metadata
    const enrichedReport: AIAnalysisReportData = {
      ...reportData,
      dataPointsCount: questionsAndAnswers.reduce(
        (sum, qa) => sum + qa.answer.split(/\s+/).length,
        0,
      ),
      sourcesCount: questionsAndAnswers.length,
      completedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    };

    // Save report and update status
    await prisma.aIBrandAnalysisSession.update({
      where: { id: sessionId },
      data: {
        status: "REPORT_READY",
        reportData: JSON.parse(JSON.stringify(enrichedReport)),
        completedAt: session.completedAt ?? new Date(),
        lastUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({
      status: "REPORT_READY",
      message: "Report generated successfully",
    });
  } catch (error) {
    console.error("[POST /api/brand-assets/:id/ai-analysis/:sessionId/generate-report]", error);

    // Revert status on error
    const { sessionId } = await params;
    await prisma.aIBrandAnalysisSession.update({
      where: { id: sessionId },
      data: { status: "ERROR", lastUpdatedAt: new Date() },
    }).catch(() => {});

    const parsed = parseAIError(error);
    return NextResponse.json({ error: getReadableErrorMessage(parsed) }, { status: getAIErrorStatus(parsed) });
  }
}
