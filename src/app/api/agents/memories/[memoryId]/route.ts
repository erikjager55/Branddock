// =============================================================
// DELETE /api/agents/memories/[memoryId] — memory verwijderen
// (agents-scheduling, slice 4; acceptatiecriterium: user kan
// memory-items inzien en verwijderen).
// =============================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceRole } from "@/lib/auth/require-role";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ memoryId: string }> },
) {
  try {
    const { memoryId } = await params;
    const role = await requireWorkspaceRole(["owner", "admin", "member"]);
    if (role instanceof NextResponse) return role;
    const workspaceId = role.workspaceId;

    // Workspace-filter in de delete zelf — geen cross-tenant deletes.
    const deleted = await prisma.agentMemory.deleteMany({
      where: { id: memoryId, workspaceId },
    });
    if (deleted.count === 0) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    invalidateCache(cacheKeys.prefixes.agents(workspaceId));
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[DELETE /api/agents/memories/[memoryId]]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
