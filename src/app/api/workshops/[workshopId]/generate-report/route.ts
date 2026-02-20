import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { openaiClient } from "@/lib/ai/openai-client";
import { buildWorkshopReportPrompt } from "@/lib/ai/prompts/workshop-report";
import { parseAIError, getReadableErrorMessage, getAIErrorStatus } from "@/lib/ai/error-handler";

type RouteParams = { params: Promise<{ workshopId: string }> };

// =============================================================
// POST /api/workshops/[workshopId]/generate-report
// AI rapport generatie via OpenAI
// =============================================================
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { workshopId } = await params;

    const workshop = await prisma.workshop.findFirst({
      where: { id: workshopId, workspaceId },
      include: {
        steps: { orderBy: { stepNumber: "asc" } },
        brandAsset: { select: { id: true, name: true, category: true, description: true } },
      },
    });

    if (!workshop) {
      return NextResponse.json({ error: "Workshop not found" }, { status: 404 });
    }

    if (workshop.reportGenerated) {
      return NextResponse.json({ error: "Report already generated" }, { status: 409 });
    }

    // Build prompt from step responses
    const messages = buildWorkshopReportPrompt(
      workshop.brandAsset.name,
      workshop.brandAsset.category,
      workshop.brandAsset.description ?? "",
      workshop.steps,
    );

    // Call OpenAI — createChatCompletion returns the text directly
    const content = await openaiClient.createChatCompletion(messages);

    if (!content) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
    }

    // Parse JSON response
    let reportData: {
      executiveSummary: string;
      findings: { content: string }[];
      recommendations: { content: string; isCompleted: boolean }[];
    };
    try {
      reportData = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
    }

    // Save report data
    await prisma.workshop.update({
      where: { id: workshopId },
      data: {
        reportGenerated: true,
        executiveSummary: reportData.executiveSummary,
      },
    });

    // Save findings
    if (reportData.findings?.length) {
      await prisma.workshopFinding.createMany({
        data: reportData.findings.map((f, i) => ({
          workshopId,
          order: i + 1,
          content: f.content,
        })),
      });
    }

    // Save recommendations
    if (reportData.recommendations?.length) {
      await prisma.workshopRecommendation.createMany({
        data: reportData.recommendations.map((r, i) => ({
          workshopId,
          order: i + 1,
          content: r.content,
          isCompleted: false,
        })),
      });
    }

    return NextResponse.json({
      status: "REPORT_READY",
      executiveSummary: reportData.executiveSummary,
      findingsCount: reportData.findings?.length ?? 0,
      recommendationsCount: reportData.recommendations?.length ?? 0,
    });
  } catch (error) {
    console.error("[POST /api/workshops/:workshopId/generate-report]", error);
    const parsed = parseAIError(error);
    return NextResponse.json({ error: getReadableErrorMessage(parsed) }, { status: getAIErrorStatus(parsed) });
  }
}
