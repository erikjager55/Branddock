import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";

// POST /api/personas/[id]/generate-image
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    await getServerSession();

    const { id } = await params;

    const persona = await prisma.persona.findFirst({
      where: { id, workspaceId },
    });
    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // Stub: Use DiceBear for placeholder avatar
    const avatarUrl = `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(persona.name)}`;

    const updated = await prisma.persona.update({
      where: { id },
      data: {
        avatarUrl,
        avatarSource: "AI_GENERATED",
      },
    });

    return NextResponse.json({
      avatarUrl: updated.avatarUrl,
      avatarSource: updated.avatarSource,
    });
  } catch (error) {
    console.error("[POST /api/personas/:id/generate-image]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
