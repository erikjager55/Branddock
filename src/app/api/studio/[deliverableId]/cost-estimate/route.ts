import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// Cost lookup map: { contentType: { model: cost } }
const COST_MAP: Record<string, Record<string, number>> = {
  text: {
    claude: 0.05,
    "gpt-4": 0.06,
    gemini: 0.03,
  },
  images: {
    nanobanana: 0.10,
    gemini: 0.08,
  },
  video: {
    nanobanana: 0.50,
    veo: 0.80,
  },
  carousel: {
    nanobanana: 0.25,
    gemini: 0.20,
  },
};

const DEFAULT_COST = 0.05;

// GET /api/studio/[deliverableId]/cost-estimate — Get cost estimate
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

    const contentType = deliverable.contentTab || "text";
    const model = deliverable.aiModel || "claude";

    const contentCosts = COST_MAP[contentType] || {};
    const estimatedCost = contentCosts[model] ?? DEFAULT_COST;

    return NextResponse.json({
      estimatedCost,
      model,
      contentType,
    });
  } catch (error) {
    console.error(
      "GET /api/studio/[deliverableId]/cost-estimate error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
