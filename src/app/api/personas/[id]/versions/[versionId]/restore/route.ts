import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { requireUnlocked } from "@/lib/lock-guard";
import { restoreVersion } from "@/lib/versioning";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

type RouteParams = {
  params: Promise<{ id: string; versionId: string }>;
};

// POST /api/personas/[id]/versions/[versionId]/restore
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, versionId } = await params;

    // Must be unlocked to restore
    const lockResponse = await requireUnlocked("persona", id);
    if (lockResponse) return lockResponse;

    // Verify persona exists in this workspace
    const persona = await prisma.persona.findFirst({
      where: { id, workspaceId },
    });
    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // Verify the version exists and belongs to this persona
    const version = await prisma.resourceVersion.findFirst({
      where: { id: versionId, resourceType: "PERSONA", resourceId: id, workspaceId },
    });
    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Restore persona to this version's snapshot + create RESTORE version
    const newVersion = await restoreVersion(versionId, session.user.id);

    invalidateCache(cacheKeys.prefixes.personas(workspaceId));

    return NextResponse.json({
      restored: true,
      restoredFromVersion: version.version,
      newVersion: newVersion.version,
    });
  } catch (error) {
    console.error("[POST /api/personas/:id/versions/:versionId/restore]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
