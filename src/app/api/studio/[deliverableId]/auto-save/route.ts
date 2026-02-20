import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// POST /api/studio/[deliverableId]/auto-save — Auto-save deliverable
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    const { deliverableId } = await params;

    const body = await request.json();
    const {
      generatedText,
      generatedImageUrls,
      generatedVideoUrl,
      generatedSlides,
      checklistItems,
      prompt,
      settings,
    } = body;

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

    // Build update data — only include fields that were sent
    const updateData: Record<string, unknown> = {
      lastAutoSavedAt: new Date(),
    };

    if (generatedText !== undefined) updateData.generatedText = generatedText;
    if (generatedImageUrls !== undefined)
      updateData.generatedImageUrls = generatedImageUrls;
    if (generatedVideoUrl !== undefined)
      updateData.generatedVideoUrl = generatedVideoUrl;
    if (generatedSlides !== undefined)
      updateData.generatedSlides = generatedSlides;
    if (checklistItems !== undefined)
      updateData.checklistItems = checklistItems;
    if (prompt !== undefined) updateData.prompt = prompt;
    if (settings !== undefined) updateData.settings = settings;

    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: updateData,
    });

    return NextResponse.json({
      lastAutoSavedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "POST /api/studio/[deliverableId]/auto-save error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
