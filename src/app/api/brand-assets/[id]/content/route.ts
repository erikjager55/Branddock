import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { requireUnlocked } from "@/lib/lock-guard";
import { createVersion } from "@/lib/versioning";
import { buildBrandAssetSnapshot } from "@/lib/snapshot-builders";
import { z } from "zod";

const ContentUpdateSchema = z.object({
  content: z.string().min(1, "Content is required"),
  changeNote: z.string().optional(),
});

// =============================================================
// PATCH /api/brand-assets/[id]/content — inline edit + auto version
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

    const { id } = await params;

    const lockResponse = await requireUnlocked("brandAsset", id);
    if (lockResponse) return lockResponse;

    const asset = await prisma.brandAsset.findFirst({
      where: { id, workspaceId },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = ContentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updatedAsset = await prisma.brandAsset.update({
      where: { id },
      data: { content: parsed.data.content },
    });

    try {
      await createVersion({
        resourceType: 'BRAND_ASSET',
        resourceId: id,
        snapshot: buildBrandAssetSnapshot(updatedAsset),
        changeType: 'MANUAL_SAVE',
        changeNote: parsed.data.changeNote,
        userId: session.user.id,
        workspaceId,
      });
    } catch (versionError) {
      console.error('[BrandAsset version snapshot failed]', versionError);
    }

    return NextResponse.json({ asset: updatedAsset });
  } catch (error) {
    console.error("[PATCH /api/brand-assets/:id/content]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
