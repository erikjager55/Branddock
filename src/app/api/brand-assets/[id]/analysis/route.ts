import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthOrFallback } from "@/lib/auth-dev";

// GET: Fetch the active/latest analysis for this asset
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assetId } = await params;

    // Find the latest NewAIAnalysis for this asset
    const analysis = await prisma.newAIAnalysis.findFirst({
      where: { assetId },
      orderBy: { createdAt: "desc" },
    });

    if (!analysis) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: analysis });
  } catch (error) {
    console.error("Error fetching analysis:", error);
    return NextResponse.json(
      { error: "Failed to fetch analysis" },
      { status: 500 }
    );
  }
}

// POST: Create a new AI analysis session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthOrFallback();
    if (!authResult) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 400 }
      );
    }

    const { id: assetId } = await params;

    // Check asset exists
    const asset = await prisma.brandAsset.findUnique({
      where: { id: assetId },
    });
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Check if there's already an in-progress analysis
    const existing = await prisma.newAIAnalysis.findFirst({
      where: { assetId, status: "IN_PROGRESS" },
    });

    if (existing) {
      return NextResponse.json({ data: existing });
    }

    // Create new analysis
    const analysis = await prisma.newAIAnalysis.create({
      data: {
        type: "BRAND_ANALYSIS",
        status: "IN_PROGRESS",
        progress: 0,
        dataPoints: 0,
        messages: [] as Prisma.InputJsonValue,
        assetId,
        createdById: authResult.user.id,
      },
    });

    // Update asset status to IN_PROGRESS
    await prisma.brandAsset.update({
      where: { id: assetId },
      data: { status: "IN_PROGRESS" },
    });

    return NextResponse.json({ data: analysis }, { status: 201 });
  } catch (error) {
    console.error("Error creating analysis:", error);
    return NextResponse.json(
      { error: "Failed to create analysis" },
      { status: 500 }
    );
  }
}

// PATCH: Update analysis (add message, update progress, complete)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assetId } = await params;
    const body = await request.json();
    const { analysisId, message, progress, complete, insights } = body;

    if (!analysisId) {
      return NextResponse.json(
        { error: "analysisId is required" },
        { status: 400 }
      );
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

    const currentMessages = (analysis.messages as unknown[]) || [];
    const updateData: Prisma.NewAIAnalysisUpdateInput = {};

    // Add message
    if (message) {
      updateData.messages = [...currentMessages, message] as Prisma.InputJsonValue;
      updateData.dataPoints = currentMessages.length + 1;
    }

    // Update progress
    if (progress !== undefined) {
      updateData.progress = progress;
    }

    // Complete analysis
    if (complete) {
      updateData.status = "COMPLETED";
      updateData.progress = 100;
      if (insights) {
        updateData.executiveSummary = insights.executiveSummary;
        updateData.keyFindings = insights.findings as Prisma.InputJsonValue;
        updateData.recommendations =
          insights.recommendations as Prisma.InputJsonValue;
      }

      // Update asset status
      await prisma.brandAsset.update({
        where: { id: assetId },
        data: { status: "AI_ANALYSIS_COMPLETE" },
      });
    }

    const updated = await prisma.newAIAnalysis.update({
      where: { id: analysisId },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error updating analysis:", error);
    return NextResponse.json(
      { error: "Failed to update analysis" },
      { status: 500 }
    );
  }
}
