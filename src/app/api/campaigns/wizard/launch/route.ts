import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";

// POST /api/campaigns/wizard/launch — Launch a campaign from the wizard
const launchSchema = z.object({
  name: z.string().min(1, "name is required"),
  goalType: z.string().optional(),
  knowledgeIds: z.array(z.string()).optional(),
  strategy: z.record(z.string(), z.unknown()).optional(),
  deliverables: z.array(z.record(z.string(), z.unknown())).optional(),
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

    const { name, goalType, knowledgeIds, strategy, deliverables } = parsed.data;

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      + `-${Date.now()}`;

    const campaign = await prisma.campaign.create({
      data: {
        title: name,
        slug,
        type: "STRATEGIC",
        status: "ACTIVE",
        workspaceId,
        campaignGoalType: goalType ?? null,
        strategy: strategy ? JSON.parse(JSON.stringify(strategy)) : undefined,
      },
    });

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

    // Create deliverables if provided
    if (deliverables && deliverables.length > 0) {
      for (const d of deliverables) {
        await prisma.deliverable.create({
          data: {
            campaignId: campaign.id,
            title: (d.title as string) ?? (d.type as string) ?? "Untitled",
            contentType: (d.type as string) ?? "blog-article",
            status: "NOT_STARTED",
          },
        });
      }
    }

    return NextResponse.json({ campaign: { id: campaign.id, title: campaign.title, slug: campaign.slug } }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/campaigns/wizard/launch]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
