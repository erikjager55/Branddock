import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";

// ---------------------------------------------------------------------------
// GET /api/campaigns/[id] — Campaign detail with all relations
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
      include: {
        knowledgeAssets: true,
        deliverables: { orderBy: { createdAt: "asc" } },
        teamMembers: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: campaign.id,
      title: campaign.title,
      slug: campaign.slug,
      type: campaign.type,
      status: campaign.status,
      confidence: campaign.confidence,
      campaignGoalType: campaign.campaignGoalType,
      description: campaign.description,
      contentType: campaign.contentType,
      contentCategory: campaign.contentCategory,
      qualityScore: campaign.qualityScore,
      isArchived: campaign.isArchived,
      isSavedAsTemplate: campaign.isSavedAsTemplate,
      templateName: campaign.templateName,
      prompt: campaign.prompt,
      outputFormat: campaign.outputFormat,
      strategy: campaign.strategy,
      strategicApproach: campaign.strategicApproach,
      keyMessages: campaign.keyMessages,
      targetAudienceInsights: campaign.targetAudienceInsights,
      recommendedChannels: campaign.recommendedChannels,
      strategyConfidence: campaign.strategyConfidence,
      strategyGeneratedAt: campaign.strategyGeneratedAt?.toISOString() ?? null,
      startDate: campaign.startDate?.toISOString() ?? null,
      endDate: campaign.endDate?.toISOString() ?? null,
      createdBy: campaign.createdBy,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
      knowledgeAssets: campaign.knowledgeAssets.map((ka) => ({
        id: ka.id,
        assetName: ka.assetName,
        assetType: ka.assetType,
        validationStatus: ka.validationStatus,
        isAutoSelected: ka.isAutoSelected,
        brandAssetId: ka.brandAssetId,
        personaId: ka.personaId,
        productId: ka.productId,
        insightId: ka.insightId,
      })),
      deliverables: campaign.deliverables.map((d) => ({
        id: d.id,
        title: d.title,
        contentType: d.contentType,
        status: d.status,
        progress: d.progress,
        qualityScore: d.qualityScore,
        assignedTo: d.assignedTo,
        isFavorite: d.isFavorite,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
      teamMembers: campaign.teamMembers.map((tm) => ({
        id: tm.id,
        userId: tm.userId,
        role: tm.role,
      })),
    });
  } catch (error) {
    console.error("[GET /api/campaigns/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/campaigns/[id] — Update campaign fields
// ---------------------------------------------------------------------------
const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
  campaignGoalType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, description, status, campaignGoalType, startDate, endDate } = parsed.data;

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(campaignGoalType !== undefined && { campaignGoalType }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      slug: updated.slug,
      type: updated.type,
      status: updated.status,
      description: updated.description,
      campaignGoalType: updated.campaignGoalType,
      startDate: updated.startDate?.toISOString() ?? null,
      endDate: updated.endDate?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[PATCH /api/campaigns/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/campaigns/[id] — Delete campaign (Prisma cascade handles relations)
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    await prisma.campaign.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/campaigns/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
