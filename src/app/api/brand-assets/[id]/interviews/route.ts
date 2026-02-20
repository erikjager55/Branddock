import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

// =============================================================
// GET /api/brand-assets/[id]/interviews
// List all interviews for this brand asset + stats
// =============================================================
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id: assetId } = await params;

    const asset = await prisma.brandAsset.findFirst({
      where: { id: assetId, workspaceId },
      select: { id: true },
    });
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const interviews = await prisma.interview.findMany({
      where: { brandAssetId: assetId, workspaceId },
      include: {
        questions: { orderBy: { orderIndex: "asc" } },
        selectedAssets: { include: { brandAsset: { select: { id: true, name: true, category: true } } } },
      },
      orderBy: { orderNumber: "asc" },
    });

    const stats = {
      total: interviews.length,
      toSchedule: interviews.filter((i) => i.status === "TO_SCHEDULE" || i.status === "DRAFT").length,
      scheduled: interviews.filter((i) => i.status === "SCHEDULED").length,
      completed: interviews.filter((i) => i.status === "COMPLETED" || i.status === "APPROVED").length,
      inReview: interviews.filter((i) => i.status === "IN_REVIEW" || i.status === "INTERVIEW_HELD").length,
    };

    return NextResponse.json({ interviews, stats });
  } catch (error) {
    console.error("[GET /api/brand-assets/:id/interviews]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// POST /api/brand-assets/[id]/interviews
// Create a new interview
// =============================================================
const createSchema = z.object({
  title: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id: assetId } = await params;
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const asset = await prisma.brandAsset.findFirst({
      where: { id: assetId, workspaceId },
      select: { id: true },
    });
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Auto-increment orderNumber
    const maxOrder = await prisma.interview.aggregate({
      where: { brandAssetId: assetId, workspaceId },
      _max: { orderNumber: true },
    });

    const session = await getServerSession();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const interview = await prisma.interview.create({
      data: {
        brandAssetId: assetId,
        workspaceId,
        createdById: userId,
        status: "DRAFT",
        title: parsed.data.title || null,
        orderNumber: (maxOrder._max.orderNumber ?? 0) + 1,
        currentStep: 1,
        completedSteps: [],
      },
    });

    return NextResponse.json({ interview }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/brand-assets/:id/interviews]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
