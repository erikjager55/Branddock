import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";

// ---------------------------------------------------------------------------
// POST /api/campaigns/quick/[id]/convert — Convert quick campaign to strategic
// ---------------------------------------------------------------------------
const convertSchema = z.object({
  campaignName: z.string().min(1, "campaignName is required"),
});

export async function POST(
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

    if (campaign.type !== "QUICK") {
      return NextResponse.json(
        { error: "Only QUICK campaigns can be converted" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = convertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { campaignName } = parsed.data;
    const slug = campaignName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        type: "STRATEGIC",
        title: campaignName,
        slug: `${slug}-${Date.now()}`,
      },
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      slug: updated.slug,
      type: updated.type,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[POST /api/campaigns/quick/:id/convert]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
