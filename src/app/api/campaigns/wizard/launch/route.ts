import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { createDeliverablesFromBlueprint } from "@/lib/campaigns/strategy-chain";
import type { AssetPlanDeliverable } from "@/lib/campaigns/strategy-blueprint.types";
import { z } from "zod";

export const maxDuration = 120;

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
  contentTypeInputs: z.record(z.string(), z.union([z.string(), z.array(z.string()), z.number(), z.boolean()])).optional(),
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

    const { name, type, goalType, knowledgeIds, strategy, deliverables, briefing, draftCampaignId, contentTypeInputs } = parsed.data;

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

    // Link knowledge assets if provided. Items arrive as composite keys
    // "sourceType:sourceId" so the source TYPE is preserved (was: every id
    // blindly written as brand_asset, which the content-item picker hides).
    // Bare ids without a colon are treated as brand_asset for backwards-compat.
    if (knowledgeIds && knowledgeIds.length > 0) {
      const FK_COLUMN: Record<string, "brandAssetId" | "personaId" | "productId"> = {
        brand_asset: "brandAssetId",
        persona: "personaId",
        product: "productId",
      };
      const ASSET_TYPE_LABEL: Record<string, string> = {
        brand_asset: "Brand",
        persona: "Persona",
        product: "Product",
        detected_trend: "Trend",
        knowledge_resource: "Knowledge",
        competitor: "Competitor",
        business_strategy: "Strategy",
      };

      const parsed = knowledgeIds
        .map((key) => {
          const idx = key.indexOf(":");
          return {
            sourceType: idx > 0 ? key.slice(0, idx) : "brand_asset",
            sourceId: idx > 0 ? key.slice(idx + 1) : key,
          };
        })
        .filter((p) => p.sourceId.length > 0);

      // Best-effort display name for brand assets; other types resolve their
      // real title from live context at seeding time (assembleCanvasContext).
      const brandIds = parsed.filter((p) => p.sourceType === "brand_asset").map((p) => p.sourceId);
      const brandNames = brandIds.length > 0
        ? new Map(
            (
              await prisma.brandAsset.findMany({
                where: { id: { in: brandIds } },
                select: { id: true, name: true },
              })
            ).map((a) => [a.id, a.name]),
          )
        : new Map<string, string>();

      const rows: Prisma.CampaignKnowledgeAssetCreateManyInput[] = parsed.map(
        ({ sourceType, sourceId }) => {
          const row: Prisma.CampaignKnowledgeAssetCreateManyInput = {
            campaignId: campaign.id,
            sourceType,
            sourceId,
            assetName:
              sourceType === "brand_asset"
                ? brandNames.get(sourceId) ?? "Unknown"
                : ASSET_TYPE_LABEL[sourceType] ?? sourceType,
            assetType: ASSET_TYPE_LABEL[sourceType] ?? sourceType,
            // Wizard-selected knowledge is auto-selected for content items in
            // the campaign (drives the Step-1 picker pre-selection).
            isAutoSelected: true,
          };
          const fk = FK_COLUMN[sourceType];
          if (fk) row[fk] = sourceId;
          return row;
        },
      );

      await prisma.campaignKnowledgeAsset.createMany({
        data: rows,
        skipDuplicates: true,
      });
    }

    // Create deliverables: prefer blueprint asset plan (rich metadata), fall back to simple list
    const blueprintStrategy = strategy as
      | {
          assetPlan?: { deliverables?: AssetPlanDeliverable[] };
          architecture?: { journeyPhases?: import('@/lib/campaigns/strategy-blueprint.types').JourneyPhase[] };
        }
      | undefined;
    const assetPlanDeliverables = blueprintStrategy?.assetPlan?.deliverables;
    const blueprintPhases = blueprintStrategy?.architecture?.journeyPhases;

    // Fetch campaign date range — fed to the scheduler so suggested dates
    // fall inside the campaign window when the user has set one.
    const campaignDates = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      select: { startDate: true, endDate: true },
    });

    if (assetPlanDeliverables && assetPlanDeliverables.length > 0) {
      await createDeliverablesFromBlueprint(
        campaign.id,
        assetPlanDeliverables,
        {
          campaignStart: campaignDates?.startDate ?? null,
          campaignEnd: campaignDates?.endDate ?? null,
          phases: blueprintPhases,
        },
      );
    } else if (deliverables && deliverables.length > 0) {
      // Fallback: use wizard-provided deliverables with briefing from wizard
      const briefSettings = briefing || contentTypeInputs ? {
        ...(briefing ? {
          brief: {
            objective: briefing.occasion || briefing.audienceObjective || undefined,
            keyMessage: briefing.coreMessage || undefined,
            toneDirection: briefing.tonePreference || undefined,
          },
        } : {}),
        ...(contentTypeInputs && Object.keys(contentTypeInputs).length > 0
          ? { contentTypeInputs }
          : {}),
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
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
