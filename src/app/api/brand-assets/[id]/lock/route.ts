import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";

// =============================================================
// PATCH /api/brand-assets/[id]/lock — toggle lock/unlock
// =============================================================
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const asset = await prisma.brandAsset.findFirst({
      where: { id, workspaceId },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // If currently locked by someone else, deny
    if (asset.isLocked && asset.lockedById !== session.user.id) {
      return NextResponse.json(
        { error: "Asset is locked by another user" },
        { status: 423 }
      );
    }

    const shouldLock = !asset.isLocked;

    const updated = await prisma.brandAsset.update({
      where: { id },
      data: {
        isLocked: shouldLock,
        lockedById: shouldLock ? session.user.id : null,
        lockedAt: shouldLock ? new Date() : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/brand-assets/:id/lock]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
