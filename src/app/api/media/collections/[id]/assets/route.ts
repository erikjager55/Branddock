import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

/** POST /api/media/collections/[id]/assets — add asset to collection */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: collectionId } = await params;
    const body = await request.json();
    const { mediaAssetId, sortOrder } = body;

    if (!mediaAssetId || typeof mediaAssetId !== "string") {
      return NextResponse.json(
        { error: "mediaAssetId is required" },
        { status: 400 }
      );
    }

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

    // Verify asset belongs to workspace
    const asset = await prisma.mediaAsset.findFirst({
      where: { id: mediaAssetId, workspaceId },
    });

    if (!asset) {
      return NextResponse.json(
        { error: "Media asset not found" },
        { status: 404 }
      );
    }

    // Check if already in collection (@@unique([mediaAssetId, collectionId]))
    const existingLink = await prisma.mediaCollectionAsset.findUnique({
      where: {
        mediaAssetId_collectionId: { mediaAssetId, collectionId },
      },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: "Asset is already in this collection" },
        { status: 409 }
      );
    }

    const collectionAsset = await prisma.mediaCollectionAsset.create({
      data: {
        mediaAssetId,
        collectionId,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      },
    });

    invalidateCache(cacheKeys.prefixes.media(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json(
      {
        id: collectionAsset.id,
        mediaAssetId: collectionAsset.mediaAssetId,
        collectionId: collectionAsset.collectionId,
        sortOrder: collectionAsset.sortOrder,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding asset to collection:", error);
    return NextResponse.json(
      { error: "Failed to add asset to collection" },
      { status: 500 }
    );
  }
}

/** PATCH /api/media/collections/[id]/assets — reorder assets in collection */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: collectionId } = await params;
    const body = await request.json();
    const { assetIds } = body;

    if (!Array.isArray(assetIds)) {
      return NextResponse.json(
        { error: "assetIds array is required" },
        { status: 400 }
      );
    }

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

    // Update sortOrder for each asset in the collection
    const updates = assetIds.map((mediaAssetId: string, index: number) =>
      prisma.mediaCollectionAsset.updateMany({
        where: { collectionId, mediaAssetId },
        data: { sortOrder: index },
      })
    );

    await prisma.$transaction(updates);

    invalidateCache(cacheKeys.prefixes.media(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering collection assets:", error);
    return NextResponse.json(
      { error: "Failed to reorder assets" },
      { status: 500 }
    );
  }
}
