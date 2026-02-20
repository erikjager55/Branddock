import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";

// GET /api/studio/[deliverableId] — Returns full studio state
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    const { deliverableId } = await params;

    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            workspaceId: true,
            confidence: true,
            knowledgeAssets: true,
          },
        },
        _count: {
          select: { versions: true },
        },
      },
    });

    if (!deliverable) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }

    // Verify workspace ownership
    if (deliverable.campaign.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const imageUrls = deliverable.generatedImageUrls as string[] | null;
    const slides = deliverable.generatedSlides as unknown[] | null;

    const isTabLocked =
      deliverable.generatedText != null ||
      (imageUrls != null && imageUrls.length > 0) ||
      deliverable.generatedVideoUrl != null ||
      (slides != null && slides.length > 0);

    return NextResponse.json({
      deliverable: {
        id: deliverable.id,
        title: deliverable.title,
        contentTab: deliverable.contentTab,
        status: deliverable.status,
        progress: deliverable.progress,
        prompt: deliverable.prompt,
        aiModel: deliverable.aiModel,
        settings: deliverable.settings,
        generatedText: deliverable.generatedText,
        generatedImageUrls: deliverable.generatedImageUrls,
        generatedVideoUrl: deliverable.generatedVideoUrl,
        generatedSlides: deliverable.generatedSlides,
        checklistItems: deliverable.checklistItems,
        lastAutoSavedAt: deliverable.lastAutoSavedAt,
      },
      campaign: {
        id: deliverable.campaign.id,
        title: deliverable.campaign.title,
      },
      activeTab: deliverable.contentTab || "text",
      isTabLocked,
      knowledgeConfidence: deliverable.campaign.confidence,
      knowledgeAssets: deliverable.campaign.knowledgeAssets,
      versionsCount: deliverable._count.versions,
    });
  } catch (error) {
    console.error("GET /api/studio/[deliverableId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/studio/[deliverableId] — Update deliverable fields
const patchSchema = z.object({
  prompt: z.string().optional(),
  aiModel: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  contentTab: z.string().optional(),
  generatedText: z.string().nullable().optional(),
  generatedImageUrls: z.array(z.string()).optional(),
  generatedVideoUrl: z.string().nullable().optional(),
  generatedSlides: z.array(z.record(z.string(), z.unknown())).optional(),
  checklistItems: z.array(z.record(z.string(), z.unknown())).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    const { deliverableId } = await params;

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: {
        campaign: { select: { workspaceId: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }

    if (existing.campaign.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Build update data, casting JSON fields for Prisma compatibility
    const updateData: Record<string, unknown> = {};
    const { settings, generatedSlides, checklistItems, ...rest } = parsed.data;

    Object.entries(rest).forEach(([key, value]) => {
      if (value !== undefined) updateData[key] = value;
    });

    if (settings !== undefined)
      updateData.settings = JSON.parse(JSON.stringify(settings));
    if (generatedSlides !== undefined)
      updateData.generatedSlides = JSON.parse(JSON.stringify(generatedSlides));
    if (checklistItems !== undefined)
      updateData.checklistItems = JSON.parse(JSON.stringify(checklistItems));

    const updated = await prisma.deliverable.update({
      where: { id: deliverableId },
      data: updateData,
    });

    return NextResponse.json({ deliverable: updated });
  } catch (error) {
    console.error("PATCH /api/studio/[deliverableId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
