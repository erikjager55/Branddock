import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { z } from "zod";

const LockSchema = z.object({
  locked: z.boolean(),
});

// =============================================================
// PATCH /api/brand-assets/[id]/golden-circle/lock — lock/unlock
// =============================================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const session = await getServerSession();
    const { id } = await params;

    const asset = await prisma.brandAsset.findFirst({
      where: { id, workspaceId },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = LockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const updated = await prisma.brandAsset.update({
      where: { id },
      data: {
        isLocked: parsed.data.locked,
        lockedAt: parsed.data.locked ? new Date() : null,
        lockedById: parsed.data.locked ? session?.user?.id ?? null : null,
      },
    });

    return NextResponse.json({
      isLocked: updated.isLocked,
      lockedAt: updated.lockedAt,
    });
  } catch (error) {
    console.error("[PATCH /api/brand-assets/:id/golden-circle/lock]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
