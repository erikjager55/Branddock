import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

// PATCH /api/competitors/[id]/lock
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.competitor.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
    }

    const body = await request.json();
    const { locked } = body;

    if (typeof locked !== "boolean") {
      return NextResponse.json(
        { error: "locked must be a boolean" },
        { status: 400 },
      );
    }

    const competitor = await prisma.competitor.update({
      where: { id },
      data: {
        isLocked: locked,
        lockedById: locked ? session.user.id : null,
        lockedAt: locked ? new Date() : null,
      },
      include: {
        lockedBy: { select: { id: true, name: true } },
      },
    });

    invalidateCache(cacheKeys.prefixes.competitors(workspaceId));

    return NextResponse.json({
      isLocked: competitor.isLocked,
      lockedById: competitor.lockedById,
      lockedAt: competitor.lockedAt?.toISOString() ?? null,
      lockedBy: competitor.lockedBy
        ? { id: competitor.lockedBy.id, name: competitor.lockedBy.name }
        : null,
    });
  } catch (error) {
    console.error("[PATCH /api/competitors/:id/lock]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
