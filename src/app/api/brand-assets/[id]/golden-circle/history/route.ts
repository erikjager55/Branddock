import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/brand-assets/[id]/golden-circle/history — version history
// =============================================================
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const asset = await prisma.brandAsset.findFirst({
      where: { id, workspaceId },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const versions = await prisma.brandAssetVersion.findMany({
      where: { brandAssetId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        version: true,
        changeNote: true,
        content: true,
        createdAt: true,
        changedBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ versions });
  } catch (error) {
    console.error("[GET /api/brand-assets/:id/golden-circle/history]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
