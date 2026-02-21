import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";
import { buildSelectedPersonasContext } from "@/lib/ai/persona-context";

const generateSchema = z.object({
  model: z.string(),
  prompt: z.string(),
  settings: z.record(z.string(), z.unknown()),
  knowledgeAssetIds: z.array(z.string()).optional(),
  personaIds: z.array(z.string()).optional(),
});

// POST /api/studio/[deliverableId]/generate — Generate content (stub)
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

    // Verify ownership
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: {
        campaign: { select: { workspaceId: true } },
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

    // Build persona context if personaIds provided
    const { personaIds } = parsed.data;
    let personaContext = "";
    if (personaIds && personaIds.length > 0) {
      personaContext = await buildSelectedPersonasContext(personaIds, workspaceId);
      console.log("[generate] Persona context loaded:", {
        requestedIds: personaIds,
        contextLength: personaContext.length,
      });
    }

    const contentTab = deliverable.contentTab || "text";
    const { model } = parsed.data;

    // Generate demo content based on contentTab
    let generatedText: string | null = null;
    let generatedImageUrls: string[] = [];
    let generatedVideoUrl: string | null = null;
    let generatedSlides: Array<Record<string, string | number>> = [];

    switch (contentTab) {
      case "text":
        generatedText = `# Brand Strategy: A Comprehensive Guide\n\nIn today's rapidly evolving marketplace, a strong brand strategy is the foundation upon which successful businesses are built. Your brand is more than just a logo or a tagline — it's the emotional connection you forge with your audience, the promise you make, and the experience you deliver at every touchpoint.\n\nEffective brand strategy begins with deep understanding. Understanding your market, your competitors, and most importantly, your customers. Through rigorous research and validation, brands can identify the unique positioning that sets them apart. This involves analyzing market trends, conducting persona interviews, and leveraging AI-driven insights to uncover hidden opportunities that traditional methods might miss.\n\nThe journey from strategy to execution requires alignment across all channels and touchpoints. Content should be consistent yet adaptive — speaking the same brand language while resonating with different audience segments. By maintaining this balance, organizations can build lasting brand equity that drives growth, loyalty, and competitive advantage in an increasingly crowded marketplace.`;
        break;

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
          {
            slideNumber: 1,
            imageUrl: "https://picsum.photos/1080/1080?random=10",
            textOverlay: "Building Brands That Matter",
            subtitle: "A strategic approach to brand development",
          },
          {
            slideNumber: 2,
            imageUrl: "https://picsum.photos/1080/1080?random=11",
            textOverlay: "Research-Driven Insights",
            subtitle: "Uncover what your audience truly needs",
          },
          {
            slideNumber: 3,
            imageUrl: "https://picsum.photos/1080/1080?random=12",
            textOverlay: "Consistent Brand Voice",
            subtitle: "Speak with clarity across every channel",
          },
          {
            slideNumber: 4,
            imageUrl: "https://picsum.photos/1080/1080?random=13",
            textOverlay: "Measure & Optimize",
            subtitle: "Data-driven decisions for lasting impact",
          },
        ];
        break;
    }

    // Calculate cost based on model
    const costMap: Record<string, number> = {
      claude: 0.05,
      "gpt-4": 0.06,
      gemini: 0.03,
      nanobanana: 0.10,
      veo: 0.80,
    };
    const costIncurred = costMap[model] || 0.05;

    // Build update data for Prisma
    const updateData: Record<string, unknown> = {
      status: "IN_PROGRESS",
      progress: 50,
    };

    if (generatedText !== null) updateData.generatedText = generatedText;
    if (generatedImageUrls.length > 0)
      updateData.generatedImageUrls = generatedImageUrls;
    if (generatedVideoUrl !== null)
      updateData.generatedVideoUrl = generatedVideoUrl;
    if (generatedSlides.length > 0)
      updateData.generatedSlides = JSON.parse(JSON.stringify(generatedSlides));

    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: updateData,
    });

    return NextResponse.json({
      generatedText,
      generatedImageUrls,
      generatedVideoUrl,
      generatedSlides,
      qualityScore: 82,
      qualityMetrics: {
        clarity: 85,
        brandAlignment: 80,
        engagement: 78,
        originality: 84,
      },
      costIncurred,
      generationTime: 3500,
      contentTab,
      model,
    });
  } catch (error) {
    console.error(
      "POST /api/studio/[deliverableId]/generate error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
