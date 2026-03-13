import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";
import { buildSelectedPersonasContext } from "@/lib/ai/persona-context";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

const regenerateSchema = z.object({
  model: z.string(),
  prompt: z.string(),
  settings: z.record(z.string(), z.unknown()),
  knowledgeAssetIds: z.array(z.string()).optional(),
  personaIds: z.array(z.string()).optional(),
});

// POST /api/studio/[deliverableId]/regenerate — Regenerate content (stub)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    const { deliverableId } = await params;

    const body = await request.json();
    const parsed = regenerateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify ownership — include campaign strategy for context parity with generate route
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

    // Build persona context if personaIds provided
    const { personaIds } = parsed.data;
    let personaContext = "";
    if (personaIds && personaIds.length > 0) {
      personaContext = await buildSelectedPersonasContext(personaIds, workspaceId);
    }

    // Build campaign strategy context if available (parity with generate route)
    let campaignContextBlock = "";
    const campaignStrategy = deliverable.campaign.strategy as Record<string, unknown> | null;
    if (campaignStrategy && typeof campaignStrategy === "object" && "strategy" in campaignStrategy) {
      const blueprint = campaignStrategy as {
        strategy?: { campaignTheme?: string; positioningStatement?: string; messagingHierarchy?: { brandMessage?: string; campaignMessage?: string; proofPoints?: string[] }; jtbdFraming?: { jobStatement?: string } };
        assetPlan?: { deliverables?: Array<{ title?: string; brief?: { objective?: string; keyMessage?: string; toneDirection?: string; callToAction?: string; contentOutline?: string[] } }> };
      };

      const strat = blueprint.strategy;
      const matchedBrief = blueprint.assetPlan?.deliverables?.find(
        (d) => d.title === deliverable.title
      )?.brief;

      const parts: string[] = [];
      parts.push(`## Campaign Strategy`);
      if (deliverable.campaign.title) parts.push(`Campaign: ${deliverable.campaign.title}`);
      if (strat?.campaignTheme) parts.push(`Theme: ${strat.campaignTheme}`);
      if (strat?.positioningStatement) parts.push(`Positioning: ${strat.positioningStatement}`);
      if (deliverable.campaign.campaignGoalType) parts.push(`Goal: ${deliverable.campaign.campaignGoalType}`);

      if (strat?.messagingHierarchy) {
        parts.push(`\n## Key Messages`);
        if (strat.messagingHierarchy.brandMessage) parts.push(`1. ${strat.messagingHierarchy.brandMessage}`);
        if (strat.messagingHierarchy.campaignMessage) parts.push(`2. ${strat.messagingHierarchy.campaignMessage}`);
        strat.messagingHierarchy.proofPoints?.forEach((pp, i) => parts.push(`${i + 3}. ${pp}`));
      }

      if (matchedBrief) {
        parts.push(`\n## This Deliverable`);
        if (matchedBrief.objective) parts.push(`Objective: ${matchedBrief.objective}`);
        if (matchedBrief.keyMessage) parts.push(`Key Message: ${matchedBrief.keyMessage}`);
        if (matchedBrief.toneDirection) parts.push(`Tone: ${matchedBrief.toneDirection}`);
        if (matchedBrief.callToAction) parts.push(`CTA: ${matchedBrief.callToAction}`);
        if (matchedBrief.contentOutline && matchedBrief.contentOutline.length > 0) {
          parts.push(`Outline:\n${matchedBrief.contentOutline.map((p) => `- ${p}`).join("\n")}`);
        }
      }

      campaignContextBlock = parts.join("\n");
    }

    // TODO: Pass personaContext + campaignContextBlock to AI completion call when replacing stubs
    if (personaContext || campaignContextBlock) {
      console.log("[regenerate] Context loaded:", {
        personaContextLength: personaContext.length,
        campaignContextLength: campaignContextBlock.length,
      });
    }

    const contentTab = deliverable.contentTab || "text";
    const { model } = parsed.data;

    // Regenerate with slightly different placeholder content
    let generatedText: string | null = null;
    let generatedImageUrls: string[] = [];
    let generatedVideoUrl: string | null = null;
    let generatedSlides: Array<Record<string, string | number>> = [];

    switch (contentTab) {
      case "text":
        generatedText = `# Elevating Your Brand Strategy for Maximum Impact\n\nThe most successful brands in the modern landscape share a common trait: they understand that brand strategy is not a one-time exercise but an ongoing journey of discovery, refinement, and adaptation. Every interaction with your audience is an opportunity to reinforce your brand promise and deepen the relationship that drives long-term loyalty.\n\nResearch shows that brands with clearly defined strategies outperform their competitors by up to 3.5x in revenue growth. This advantage stems from the alignment between brand positioning, customer expectations, and operational execution. When these elements work in harmony, the result is a brand that doesn't just compete — it leads.\n\nTo achieve this level of strategic excellence, organizations must invest in continuous validation. Leveraging AI-powered analytics, persona-driven research, and real-time market intelligence allows brands to stay ahead of shifting trends while maintaining the authentic core that makes them unique. The future belongs to brands that are both data-informed and human-centered.`;
        break;

      case "images":
        generatedImageUrls = [
          "https://picsum.photos/800/600?random=4",
          "https://picsum.photos/800/600?random=5",
          "https://picsum.photos/800/600?random=6",
        ];
        break;

      case "video":
        generatedVideoUrl = "";
        break;

      case "carousel":
        generatedSlides = [
          {
            slideNumber: 1,
            imageUrl: "https://picsum.photos/1080/1080?random=20",
            textOverlay: "Your Brand, Reimagined",
            subtitle: "Strategic positioning for the modern market",
          },
          {
            slideNumber: 2,
            imageUrl: "https://picsum.photos/1080/1080?random=21",
            textOverlay: "Data Meets Creativity",
            subtitle: "Insights that fuel authentic storytelling",
          },
          {
            slideNumber: 3,
            imageUrl: "https://picsum.photos/1080/1080?random=22",
            textOverlay: "Connect & Convert",
            subtitle: "Turn brand moments into lasting relationships",
          },
          {
            slideNumber: 4,
            imageUrl: "https://picsum.photos/1080/1080?random=23",
            textOverlay: "Scale With Confidence",
            subtitle: "Validated strategies that grow with you",
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

    // Invalidate caches so campaign detail + dashboard reflect updated deliverable
    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({
      generatedText,
      generatedImageUrls,
      generatedVideoUrl,
      generatedSlides,
      qualityScore: 87,
      qualityMetrics: {
        clarity: 90,
        brandAlignment: 85,
        engagement: 84,
        originality: 88,
      },
      costIncurred,
      generationTime: 3500,
      contentTab,
      model,
    });
  } catch (error) {
    console.error(
      "POST /api/studio/[deliverableId]/regenerate error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
