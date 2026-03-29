import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

/** PATCH /api/media/[id]/archive — Toggle isArchived */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existing = await prisma.mediaAsset.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Media asset not found" },
        { status: 404 }
      );
    }

    const asset = await prisma.mediaAsset.update({
      where: { id },
      data: { isArchived: !existing.isArchived },
    });

    invalidateCache(cacheKeys.prefixes.media(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json(asset);
  } catch (error) {
    console.error("Error toggling archive status:", error);
    return NextResponse.json(
      { error: "Failed to toggle archive status" },
      { status: 500 }
    );
  }
}
