import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/brand-assets/[id]/versions — version history with pagination
// =============================================================
export async function GET(
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

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const [versions, total] = await Promise.all([
      prisma.brandAssetVersion.findMany({
        where: { brandAssetId: id },
        orderBy: { version: "desc" },
        skip: offset,
        take: limit,
        include: {
          changedBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.brandAssetVersion.count({ where: { brandAssetId: id } }),
    ]);

    return NextResponse.json({ versions, total, limit, offset });
  } catch (error) {
    console.error("[GET /api/brand-assets/:id/versions]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
