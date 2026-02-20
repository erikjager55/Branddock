import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

const previewSchema = z.object({
  selectedAssetIds: z.array(z.string()).min(1),
});

// =============================================================
// POST /api/brand-assets/[id]/workshops/preview-impact — dashboard impact preview
// =============================================================
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

    const asset = await prisma.brandAsset.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = previewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { selectedAssetIds } = parsed.data;

    // Fetch assets with their research methods
    const assets = await prisma.brandAsset.findMany({
      where: { id: { in: selectedAssetIds }, workspaceId },
      include: {
        researchMethods: {
          where: { method: "WORKSHOP" },
        },
      },
    });

    const impacts = assets.map((a) => {
      const workshopMethod = a.researchMethods[0];
      const currentStatus = workshopMethod?.status ?? "AVAILABLE";
      return {
        assetId: a.id,
        assetName: a.name,
        currentStatus,
        afterStatus: currentStatus === "COMPLETED" || currentStatus === "VALIDATED"
          ? currentStatus
          : "IN_PROGRESS",
      };
    });

    const updatedCount = impacts.filter(
      (i) => i.currentStatus !== i.afterStatus
    ).length;

    return NextResponse.json({ impacts, updatedCount });
  } catch (error) {
    console.error("[POST /api/brand-assets/:id/workshops/preview-impact]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
