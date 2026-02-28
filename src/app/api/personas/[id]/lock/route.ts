import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { createVersion } from "@/lib/versioning";
import { buildPersonaSnapshot } from "@/lib/snapshot-builders";

// PATCH /api/personas/[id]/lock
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

    const existing = await prisma.persona.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const body = await request.json();
    const { locked } = body;

    if (typeof locked !== "boolean") {
      return NextResponse.json(
        { error: "locked must be a boolean" },
        { status: 400 }
      );
    }

    const persona = await prisma.persona.update({
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

    invalidateCache(cacheKeys.prefixes.personas(workspaceId));

    // Create LOCK_BASELINE version snapshot when locking
    if (locked) {
      try {
        await createVersion({
          resourceType: 'PERSONA',
          resourceId: id,
          snapshot: buildPersonaSnapshot(persona),
          changeType: 'LOCK_BASELINE',
          changeNote: 'Locked persona',
          userId: session.user.id,
          workspaceId,
        });
      } catch (versionError) {
        console.error('[Persona lock version snapshot failed]', versionError);
      }
    }

    return NextResponse.json({
      isLocked: persona.isLocked,
      lockedAt: persona.lockedAt?.toISOString() ?? null,
      lockedBy: persona.lockedBy ? { id: persona.lockedBy.id, name: persona.lockedBy.name } : null,
    });
  } catch (error) {
    console.error("[PATCH /api/personas/:id/lock]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
