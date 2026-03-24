import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { buildGenerationContext } from "@/lib/studio/context-builder";
import { getPromptTemplate } from "@/lib/studio/prompt-templates";
import { routeGeneration, isModelAvailable } from "@/lib/studio/ai-router";
import { parseGeneratedContent } from "@/lib/studio/output-parser";
import { validateContent } from "@/lib/studio/content-validator";
import { DELIVERABLE_TYPES } from "@/features/campaigns/lib/deliverable-types";

const generateSchema = z.object({
  model: z.string(),
  prompt: z.string(),
  settings: z.record(z.string(), z.unknown()),
  knowledgeAssetIds: z.array(z.string()).optional(),
  personaIds: z.array(z.string()).optional(),
});

/**
 * Resolve a contentType (display name like "Blog Post" or slug like "blog-post")
 * to a prompt template ID (slug). Returns the input unchanged if already a valid slug.
 */
function resolveTemplateId(contentType: string): string {
  // Direct slug match (e.g. "blog-post")
  const directMatch = DELIVERABLE_TYPES.find((d) => d.id === contentType);
  if (directMatch) return directMatch.id;

  // Display name match (e.g. "Blog Post")
  const nameMatch = DELIVERABLE_TYPES.find(
    (d) => d.name.toLowerCase() === contentType.toLowerCase()
  );
  if (nameMatch) return nameMatch.id;

  // Slugify the contentType as last resort (e.g. "Blog Post" → "blog-post")
  return contentType.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// POST /api/studio/[deliverableId]/generate — Generate content via AI
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    const { deliverableId } = await params;

    const body = await request.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { model, prompt, settings, personaIds } = parsed.data;

    // Check if the selected AI model is available
    if (!isModelAvailable(model)) {
      return NextResponse.json(
        { error: `AI model "${model}" is not configured. Please check your API keys.` },
        { status: 422 }
      );
    }

    // Verify ownership — include campaign strategy for context injection
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: {
        campaign: {
          select: {
            workspaceId: true,
            title: true,
            campaignGoalType: true,
            strategy: true,
          },
        },
      },
    });

    if (!deliverable) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }

    if (deliverable.campaign.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const contentTab = deliverable.contentTab || "text";

    // Only text tab uses AI generation for now; images/video/carousel remain stubs
    if (contentTab !== "text") {
      return generateStubContent(deliverableId, contentTab, model, workspaceId);
    }

    // ─── AI Text Generation ───────────────────────────────────

    const startTime = Date.now();

    // 1. Build generation context (brand + persona + campaign + brief)
    const context = await buildGenerationContext(
      workspaceId,
      personaIds || [],
      {
        campaignTitle: deliverable.campaign.title,
        campaignGoalType: deliverable.campaign.campaignGoalType,
        strategy: deliverable.campaign.strategy as Record<string, unknown> | null,
      },
      deliverable.title,
    );

    // 2. Get prompt template for this deliverable type
    const templateId = resolveTemplateId(deliverable.contentType);
    const template = getPromptTemplate(templateId);

    // 3. Build system + user prompts
    const systemPrompt = template.systemPrompt;
    const userPrompt = template.buildUserPrompt({
      userPrompt: prompt,
      context,
      settings: (settings as unknown) as import("@/types/studio").TypeSettings | null,
      deliverableTitle: deliverable.title,
      contentType: deliverable.contentType,
    });

    // 4. Route to AI provider and generate
    const rawOutput = await routeGeneration({
      modelId: model,
      systemPrompt,
      userPrompt,
      contentLength: (settings as Record<string, unknown>)?.length as string | undefined,
      workspaceId,
    });

    // 5. Parse markdown → HTML for TipTap
    const generatedHtml = parseGeneratedContent(rawOutput);

    const generationTime = Date.now() - startTime;

    // 6. Run content validation (non-blocking, never gates output)
    const [personaRecords, competitorRecords, workspace] = await Promise.all([
      personaIds && personaIds.length > 0
        ? prisma.persona.findMany({
            where: { id: { in: personaIds } },
            select: { name: true },
          })
        : Promise.resolve([]),
      prisma.competitor.findMany({
        where: { workspaceId },
        select: { name: true },
      }),
      prisma.workspace.findFirst({
        where: { id: workspaceId },
        select: { name: true },
      }),
    ]);

    const validationResult = validateContent(rawOutput, {
      personaNames: personaRecords.map((p) => p.name),
      competitorNames: competitorRecords.map((c) => c.name),
      brandName: workspace?.name || '',
      contentType: deliverable.contentType,
    });

    // Calculate cost based on model
    const costMap: Record<string, number> = {
      claude: 0.05,
      "gpt-4": 0.06,
      gemini: 0.03,
    };
    const costIncurred = costMap[model] || 0.05;

    // Save generated content + validation to database
    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        generatedText: generatedHtml,
        status: "IN_PROGRESS",
        progress: 50,
        qualityMetrics: JSON.parse(JSON.stringify(validationResult)),
      },
    });

    // Invalidate caches
    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({
      generatedText: generatedHtml,
      generatedImageUrls: [],
      generatedVideoUrl: null,
      generatedSlides: [],
      qualityScore: null,
      qualityMetrics: null,
      costIncurred,
      generationTime,
      contentTab,
      model,
      validation: validationResult,
    });
  } catch (error) {
    console.error(
      "POST /api/studio/[deliverableId]/generate error:",
      error
    );

    // Return a user-friendly error message
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * Generate stub content for non-text tabs (images, video, carousel).
 * These remain placeholder until visual generation is implemented.
 */
async function generateStubContent(
  deliverableId: string,
  contentTab: string,
  model: string,
  workspaceId: string,
) {
  let generatedImageUrls: string[] = [];
  let generatedVideoUrl: string | null = null;
  let generatedSlides: Array<Record<string, string | number>> = [];

  switch (contentTab) {
    case "images":
      generatedImageUrls = [
        "https://picsum.photos/800/600?random=1",
        "https://picsum.photos/800/600?random=2",
        "https://picsum.photos/800/600?random=3",
      ];
      break;

    case "video":
      generatedVideoUrl = "";
      break;

    case "carousel":
      generatedSlides = [
        { slideNumber: 1, imageUrl: "https://picsum.photos/1080/1080?random=10", textOverlay: "Building Brands That Matter", subtitle: "A strategic approach" },
        { slideNumber: 2, imageUrl: "https://picsum.photos/1080/1080?random=11", textOverlay: "Research-Driven Insights", subtitle: "Uncover what matters" },
        { slideNumber: 3, imageUrl: "https://picsum.photos/1080/1080?random=12", textOverlay: "Consistent Brand Voice", subtitle: "Across every channel" },
        { slideNumber: 4, imageUrl: "https://picsum.photos/1080/1080?random=13", textOverlay: "Measure & Optimize", subtitle: "Data-driven decisions" },
      ];
      break;
  }

  const updateData: Record<string, unknown> = {
    status: "IN_PROGRESS",
    progress: 50,
  };

  if (generatedImageUrls.length > 0) updateData.generatedImageUrls = generatedImageUrls;
  if (generatedVideoUrl !== null) updateData.generatedVideoUrl = generatedVideoUrl;
  if (generatedSlides.length > 0) updateData.generatedSlides = JSON.parse(JSON.stringify(generatedSlides));

  await prisma.deliverable.update({
    where: { id: deliverableId },
    data: updateData,
  });

  invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
  invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

  const costMap: Record<string, number> = {
    nanobanana: 0.10,
    veo: 0.80,
    gemini: 0.03,
  };

  return NextResponse.json({
    generatedText: null,
    generatedImageUrls,
    generatedVideoUrl,
    generatedSlides,
    qualityScore: null,
    qualityMetrics: null,
    costIncurred: costMap[model] || 0.05,
    generationTime: 3500,
    contentTab,
    model,
  });
}
