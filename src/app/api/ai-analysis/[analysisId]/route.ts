import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { updateAnalysisSchema } from "@/lib/validations/ai-analysis";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { analysisId } = await params;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const analysis = await prisma.newAIAnalysis.findUnique({
      where: { id: analysisId },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: analysis });
  } catch (error) {
    console.error("Error fetching AI analysis:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI analysis" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { analysisId } = await params;

    const body = await request.json();
    const parsed = updateAnalysisSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if analysis exists
    const existingAnalysis = await prisma.newAIAnalysis.findUnique({
      where: { id: analysisId },
    });

    if (!existingAnalysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Prisma.NewAIAnalysisUpdateInput = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.progress !== undefined) updateData.progress = data.progress;
    if (data.dataPoints !== undefined) updateData.dataPoints = data.dataPoints;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.messages !== undefined)
      updateData.messages = data.messages as Prisma.InputJsonValue;
    if (data.executiveSummary !== undefined)
      updateData.executiveSummary = data.executiveSummary;
    if (data.keyFindings !== undefined)
      updateData.keyFindings = data.keyFindings as Prisma.InputJsonValue;
    if (data.recommendations !== undefined)
      updateData.recommendations =
        data.recommendations as Prisma.InputJsonValue;
    if (data.dimensions !== undefined)
      updateData.dimensions = data.dimensions as Prisma.InputJsonValue;
    if (data.confidenceBoost !== undefined)
      updateData.confidenceBoost = data.confidenceBoost;

    const updatedAnalysis = await prisma.newAIAnalysis.update({
      where: { id: analysisId },
      data: updateData,
    });

    return NextResponse.json({ data: updatedAnalysis });
  } catch (error) {
    console.error("Error updating AI analysis:", error);
    return NextResponse.json(
      { error: "Failed to update AI analysis" },
      { status: 500 }
    );
  }
}
