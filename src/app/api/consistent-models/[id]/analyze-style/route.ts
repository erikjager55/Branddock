import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, requireAuth } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { analyzeIllustrationStyle } from "@/lib/consistent-models/style-analyzer";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/consistent-models/:id/analyze-style — Analyze illustration style from reference images */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Anthropic API key not configured for style analysis." },
        { status: 503 },
      );
    }

    const { id } = await context.params;

    // Fetch model with reference images
    const model = await prisma.consistentModel.findFirst({
      where: { id, workspaceId },
      include: {
        referenceImages: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    if (model.type !== "ILLUSTRATION") {
      return NextResponse.json(
        { error: "Style analysis is only available for ILLUSTRATION models" },
        { status: 400 },
      );
    }

    if (model.referenceImages.length === 0) {
      return NextResponse.json(
        { error: "Upload at least 1 reference image before analyzing style" },
        { status: 400 },
      );
    }

    // Mark analysis as in progress
    await prisma.consistentModel.update({
      where: { id },
      data: { styleAnalysisStatus: "ANALYZING", trainingError: null },
    });

    console.log(`[analyze-style] Starting analysis for model ${id} (${model.referenceImages.length} images)`);

    try {
      // Run the analysis pipeline
      const profile = await analyzeIllustrationStyle(
        model.referenceImages.map((img) => ({
          storageKey: img.storageKey,
          storageUrl: img.storageUrl,
        })),
      );

      console.log(`[analyze-style] Analysis complete for model ${id}`);

      // Store results
      await prisma.consistentModel.update({
        where: { id },
        data: {
          styleProfile: JSON.parse(JSON.stringify(profile)),
          styleProfileVersion: { increment: 1 },
          styleAnalysisStatus: "COMPLETE",
          trainingError: null,
          // Auto-fill stylePrompt and negativePrompt from the analysis
          stylePrompt: profile.generatedPrompts.stylePrompt,
          negativePrompt: profile.generatedPrompts.negativePrompt,
        },
      });

      // Invalidate cache
      invalidateCache(cacheKeys.prefixes.consistentModels(workspaceId));

      return NextResponse.json({ profile });
    } catch (analysisError) {
      // Mark as failed but don't crash the request
      const errorMessage =
        analysisError instanceof Error
          ? analysisError.message
          : "Unknown analysis error";

      console.error(`[analyze-style] Analysis failed for model ${id}:`, errorMessage);

      await prisma.consistentModel.update({
        where: { id },
        data: {
          styleAnalysisStatus: "FAILED",
          trainingError: `Style analysis failed: ${errorMessage}`,
        },
      });

      return NextResponse.json(
        { error: `Style analysis failed: ${errorMessage}` },
        { status: 500 },
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
