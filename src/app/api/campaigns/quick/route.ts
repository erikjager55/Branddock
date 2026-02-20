import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";

// ---------------------------------------------------------------------------
// POST /api/campaigns/quick — Create quick content
// ---------------------------------------------------------------------------
const quickSchema = z.object({
  contentType: z.string().min(1, "contentType is required"),
  contentCategory: z.string().min(1, "contentCategory is required"),
  prompt: z.string().min(1, "prompt is required"),
  knowledgeAssetIds: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = quickSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { contentType, contentCategory, prompt, knowledgeAssetIds } = parsed.data;

    const slug = contentType
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const campaign = await prisma.campaign.create({
      data: {
        title: contentType,
        slug: `${slug}-${Date.now()}`,
        type: "QUICK",
        status: "ACTIVE",
        contentType,
        contentCategory,
        prompt,
        workspaceId,
        deliverables: {
          create: {
            title: contentType,
            contentType,
            status: "NOT_STARTED",
            progress: 0,
          },
        },
        ...(knowledgeAssetIds && knowledgeAssetIds.length > 0
          ? {
              knowledgeAssets: {
                create: knowledgeAssetIds.map((assetId) => ({
                  assetName: assetId,
                  assetType: "Brand",
                  brandAssetId: assetId,
                })),
              },
            }
          : {}),
      },
      include: {
        deliverables: true,
        knowledgeAssets: true,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("[POST /api/campaigns/quick]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
