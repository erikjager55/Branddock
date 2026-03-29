import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

/** DELETE /api/media/collections/[id]/assets/[assetId] — remove asset from collection */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: collectionId, assetId: mediaAssetId } = await params;

    // Verify collection belongs to workspace
    const collection = await prisma.mediaCollection.findFirst({
      where: { id: collectionId, workspaceId },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Find the collection-asset link
    const link = await prisma.mediaCollectionAsset.findUnique({
      where: {
        mediaAssetId_collectionId: { mediaAssetId, collectionId },
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: "Asset is not in this collection" },
        { status: 404 }
      );
    }

    await prisma.mediaCollectionAsset.delete({
      where: { id: link.id },
    });

    invalidateCache(cacheKeys.prefixes.media(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing asset from collection:", error);
    return NextResponse.json(
      { error: "Failed to remove asset from collection" },
      { status: 500 }
    );
  }
}
