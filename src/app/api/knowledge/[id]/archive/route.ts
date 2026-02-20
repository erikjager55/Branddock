import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// PATCH /api/knowledge/:id/archive — toggle isArchived
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const resource = await prisma.knowledgeResource.findFirst({
      where: { id, workspaceId },
    });
    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const updated = await prisma.knowledgeResource.update({
      where: { id },
      data: { isArchived: !resource.isArchived },
    });

    return NextResponse.json({ id: updated.id, isArchived: updated.isArchived });
  } catch (error) {
    console.error("[PATCH /api/knowledge/:id/archive]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
