import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { createVersion } from "@/lib/versioning";
import { buildBrandAssetSnapshot } from "@/lib/snapshot-builders";

// =============================================================
// PATCH /api/brand-assets/[id]/lock — set lock state { locked: boolean }
// =============================================================
export async function PATCH(
  request: NextRequest,
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

    const body = await request.json().catch(() => ({}));
    const { locked } = body;

    if (typeof locked !== "boolean") {
      return NextResponse.json(
        { error: "Request body must contain { locked: boolean }" },
        { status: 400 }
      );
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

    const updated = await prisma.brandAsset.update({
      where: { id },
      data: {
        isLocked: locked,
        lockedById: locked ? session.user.id : null,
        lockedAt: locked ? new Date() : null,
      },
      select: {
        isLocked: true,
        lockedAt: true,
        lockedBy: { select: { id: true, name: true } },
      },
    });

    // Create lock baseline snapshot when locking
    if (locked) {
      try {
        const fullAsset = await prisma.brandAsset.findUniqueOrThrow({ where: { id } });
        await createVersion({
          resourceType: 'BRAND_ASSET',
          resourceId: id,
          snapshot: buildBrandAssetSnapshot(fullAsset),
          changeType: 'LOCK_BASELINE',
          changeNote: 'Locked — baseline snapshot',
          userId: session.user.id,
          workspaceId,
        });
      } catch (versionError) {
        console.error('[BrandAsset lock baseline snapshot failed]', versionError);
      }
    }

    return NextResponse.json({
      isLocked: updated.isLocked,
      lockedById: updated.lockedBy?.id ?? null,
      lockedBy: updated.lockedBy,
      lockedAt: updated.lockedAt,
    });
  } catch (error) {
    console.error("[PATCH /api/brand-assets/:id/lock]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
