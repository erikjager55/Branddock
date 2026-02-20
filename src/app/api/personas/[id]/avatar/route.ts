import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

// PATCH /api/personas/[id]/avatar
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    await getServerSession();

    const { id } = await params;

    const existing = await prisma.persona.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const body = await request.json();
    const { avatarUrl, source } = body;

    if (!avatarUrl || typeof avatarUrl !== "string") {
      return NextResponse.json(
        { error: "avatarUrl is required and must be a string" },
        { status: 400 }
      );
    }

    if (source !== "MANUAL_URL") {
      return NextResponse.json(
        { error: "source must be 'MANUAL_URL'" },
        { status: 400 }
      );
    }

    const persona = await prisma.persona.update({
      where: { id },
      data: {
        avatarUrl,
        avatarSource: "MANUAL_URL",
      },
    });

    invalidateCache(cacheKeys.prefixes.personas(workspaceId));

    return NextResponse.json({
      avatarUrl: persona.avatarUrl,
      avatarSource: persona.avatarSource,
    });
  } catch (error) {
    console.error("[PATCH /api/personas/:id/avatar]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
