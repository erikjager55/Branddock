import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/brand-assets/[id]/workshops/bundles — bundle list
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

    // Validate asset exists
    const { id } = await params;
    const asset = await prisma.brandAsset.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const bundles = await prisma.workshopBundle.findMany({
      where: { workspaceId },
      orderBy: { finalPrice: "asc" },
    });

    return NextResponse.json({ bundles });
  } catch (error) {
    console.error("[GET /api/brand-assets/:id/workshops/bundles]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
