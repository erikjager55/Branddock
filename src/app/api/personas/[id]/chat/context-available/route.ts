import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { getAvailableContextItems } from "@/lib/ai/context/fetcher";

// ─── GET /api/personas/[id]/chat/context-available ───────────
// Fetch all available knowledge items for the context selector.
// Uses the dynamic context registry — new types are auto-discovered.
// ──────────────────────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    // Verify persona exists in workspace
    const { id: personaId } = await params;
    const persona = await prisma.persona.findFirst({
      where: { id: personaId, workspaceId },
      select: { id: true },
    });
    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // Dynamically fetch all available context items via registry
    const groups = await getAvailableContextItems(workspaceId);

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("[GET /api/personas/:id/chat/context-available]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
