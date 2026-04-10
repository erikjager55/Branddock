import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { createDeliverablesFromBlueprint } from "@/lib/campaigns/strategy-chain";
import type { AssetPlanDeliverable } from "@/lib/campaigns/strategy-blueprint.types";
import { z } from "zod";

// POST /api/campaigns/wizard/launch — Launch a campaign from the wizard.
//
// If `draftCampaignId` is provided, the existing DRAFT Campaign row is
// promoted to ACTIVE (title/slug/strategy/goalType updated, wizard fields
// cleared). Otherwise a new Campaign is created. Knowledge assets and
// deliverables are attached in both paths using the same downstream logic.
const launchSchema = z.object({
  name: z.string().min(1, "name is required"),
  type: z.enum(["STRATEGIC", "QUICK", "CONTENT"]).optional(),
  goalType: z.string().optional(),
  knowledgeIds: z.array(z.string()).optional(),
  strategy: z.record(z.string(), z.unknown()).optional(),
  deliverables: z.array(z.record(z.string(), z.unknown())).optional(),
  briefing: z.object({
    occasion: z.string().optional(),
    audienceObjective: z.string().optional(),
    coreMessage: z.string().optional(),
    tonePreference: z.string().optional(),
    constraints: z.string().optional(),
  }).optional(),
  draftCampaignId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = launchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, type, goalType, knowledgeIds, strategy, deliverables, briefing, draftCampaignId } = parsed.data;

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      + `-${Date.now()}`;

    let campaign: { id: string; slug: string };

    if (draftCampaignId) {
      // Promotion path: verify ownership of the draft, then update in place.
      const session = await getServerSession();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const userId = session.user.id;

      const draft = await prisma.campaign.findUnique({
        where: { id: draftCampaignId },
        select: {
          id: true,
          workspaceId: true,
          wizardOwnerId: true,
          status: true,
          isArchived: true,
        },
      });

      if (
        !draft ||
        draft.workspaceId !== workspaceId ||
        draft.wizardOwnerId !== userId ||
        draft.status !== "DRAFT" ||
        draft.isArchived
      ) {
        return NextResponse.json({ error: "Draft not found" }, { status: 404 });
      }

      campaign = await prisma.campaign.update({
        where: { id: draftCampaignId },
        data: {
          title: name,
          slug,
          type: type ?? "STRATEGIC",
          status: "ACTIVE",
          campaignGoalType: goalType ?? null,
          strategy: strategy ? JSON.parse(JSON.stringify(strategy)) : undefined,
          // Clear draft persistence fields on promotion.
          // DbNull (not JsonNull) ensures the column is SQL NULL so IS NULL
          // predicates on the draft index evaluate correctly.
          wizardState: Prisma.DbNull,
          wizardStep: null,
          wizardLastSavedAt: null,
          wizardOwnerId: null,
        },
        select: { id: true, slug: true },
      });
    } else {
      // Legacy path: no draft, create a fresh Campaign.
      const created = await prisma.campaign.create({
        data: {
          title: name,
          slug,
          type: type ?? "STRATEGIC",
          status: "ACTIVE",
          workspaceId,
          campaignGoalType: goalType ?? null,
          strategy: strategy ? JSON.parse(JSON.stringify(strategy)) : undefined,
        },
        select: { id: true, slug: true },
      });
      campaign = created;
    }

    // Link knowledge assets if provided
    if (knowledgeIds && knowledgeIds.length > 0) {
      // Look up asset names for each linked asset
      const assets = await prisma.brandAsset.findMany({
        where: { id: { in: knowledgeIds } },
        select: { id: true, name: true },
      });
      const assetMap = new Map(assets.map((a) => [a.id, a.name]));

      await prisma.campaignKnowledgeAsset.createMany({
        data: knowledgeIds.map((assetId) => ({
          campaignId: campaign.id,
          brandAssetId: assetId,
          assetName: assetMap.get(assetId) ?? "Unknown",
          assetType: "Brand",
        })),
        skipDuplicates: true,
      });
    }

    // Create deliverables: prefer blueprint asset plan (rich metadata), fall back to simple list
    const blueprintStrategy = strategy as { assetPlan?: { deliverables?: AssetPlanDeliverable[] } } | undefined;
    const assetPlanDeliverables = blueprintStrategy?.assetPlan?.deliverables;

    if (assetPlanDeliverables && assetPlanDeliverables.length > 0) {
      await createDeliverablesFromBlueprint(campaign.id, assetPlanDeliverables);
    } else if (deliverables && deliverables.length > 0) {
      // Fallback: use wizard-provided deliverables with briefing from wizard
      const briefSettings = briefing ? {
        brief: {
          objective: briefing.occasion || briefing.audienceObjective || undefined,
          keyMessage: briefing.coreMessage || undefined,
          toneDirection: briefing.tonePreference || undefined,
        },
      } : undefined;

      for (const d of deliverables) {
        await prisma.deliverable.create({
          data: {
            campaignId: campaign.id,
            title: (d.title as string) ?? (d.type as string) ?? "Untitled",
            contentType: (d.type as string) ?? "blog-article",
            status: "NOT_STARTED",
            settings: briefSettings ? JSON.parse(JSON.stringify(briefSettings)) : undefined,
          },
        });
      }
    }

    // Invalidate server-side cache
    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    const deliverableCount = deliverables?.length ?? 0;

    // Fetch first deliverable ID for content mode (needs it to start generation)
    const firstDeliverable = await prisma.deliverable.findFirst({
      where: { campaignId: campaign.id },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      campaignId: campaign.id,
      campaignSlug: campaign.slug,
      deliverableCount,
      firstDeliverableId: firstDeliverable?.id ?? null,
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/campaigns/wizard/launch]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
