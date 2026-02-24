import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { createVersion } from "@/lib/versioning";
import { buildStrategySnapshot } from "@/lib/snapshot-builders";

// PATCH /api/strategies/[id]/lock
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

    const existing = await prisma.businessStrategy.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    const body = await request.json();
    const { locked } = body;

    if (typeof locked !== "boolean") {
      return NextResponse.json(
        { error: "locked must be a boolean" },
        { status: 400 }
      );
    }

    const strategy = await prisma.businessStrategy.update({
      where: { id },
      data: {
        isLocked: locked,
        lockedById: locked ? session.user.id : null,
        lockedAt: locked ? new Date() : null,
      },
    });

    // Create lock baseline snapshot when locking
    if (locked) {
      try {
        const fullStrategy = await prisma.businessStrategy.findUniqueOrThrow({ where: { id } });
        await createVersion({
          resourceType: 'STRATEGY',
          resourceId: id,
          snapshot: buildStrategySnapshot(fullStrategy),
          changeType: 'LOCK_BASELINE',
          changeNote: 'Locked — baseline snapshot',
          userId: session.user.id,
          workspaceId,
        });
      } catch (versionError) {
        console.error('[Strategy lock baseline snapshot failed]', versionError);
      }
    }

    return NextResponse.json({
      isLocked: strategy.isLocked,
      lockedById: strategy.lockedById,
      lockedAt: strategy.lockedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("[PATCH /api/strategies/:id/lock]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
