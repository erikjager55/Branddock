import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
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

    const asset = await prisma.brandAsset.findFirst({
      where: { id, workspaceId },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    if (asset.isLocked && asset.lockedById !== session.user.id) {
      return NextResponse.json(
        { error: "Asset is locked by another user" },
        { status: 423 }
      );
    }

    const body = await request.json();
    const parsed = ContentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const nextVersion = (asset.versions[0]?.version ?? 0) + 1;

    const [updatedAsset, version] = await prisma.$transaction([
      prisma.brandAsset.update({
        where: { id },
        data: { content: parsed.data.content },
      }),
      prisma.brandAssetVersion.create({
        data: {
          brandAssetId: id,
          version: nextVersion,
          content: parsed.data.content,
          frameworkData: asset.frameworkData ?? undefined,
          changeNote: parsed.data.changeNote ?? `Version ${nextVersion}`,
          changedById: session.user.id,
        },
      }),
    ]);

    return NextResponse.json({ asset: updatedAsset, version });
  } catch (error) {
    console.error("[PATCH /api/brand-assets/:id/content]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
