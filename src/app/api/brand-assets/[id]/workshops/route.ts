import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/brand-assets/[id]/workshops — workshops + bundles for asset
// =============================================================
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

    const asset = await prisma.brandAsset.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const [workshops, bundles] = await Promise.all([
      prisma.workshop.findMany({
        where: { brandAssetId: id, workspaceId },
        include: {
          steps: { orderBy: { stepNumber: "asc" } },
          participants: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.workshopBundle.findMany({
        where: { workspaceId },
        orderBy: { finalPrice: "asc" },
      }),
    ]);

    return NextResponse.json({ workshops, bundles });
  } catch (error) {
    console.error("[GET /api/brand-assets/:id/workshops]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
