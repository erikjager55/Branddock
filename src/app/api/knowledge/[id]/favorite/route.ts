import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// PATCH /api/knowledge/:id/favorite — toggle isFavorite
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
      data: { isFavorite: !resource.isFavorite },
    });

    return NextResponse.json({ id: updated.id, isFavorite: updated.isFavorite });
  } catch (error) {
    console.error("[PATCH /api/knowledge/:id/favorite]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
