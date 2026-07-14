// =============================================================
// GET /api/agents/memories?agentId= — memory-lijst van één agent
// (agents-scheduling, slice 4). Non-vector kolommen via de gewone
// client; kleine tabel, bewust ongecachet (mutaties lopen via het
// confirm-pad en de delete-route).
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agentId = request.nextUrl.searchParams.get("agentId");
    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    const memories = await prisma.agentMemory.findMany({
      where: { workspaceId, agentId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        content: true,
        memoryType: true,
        source: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      memories: memories.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    });
  } catch (err) {
    console.error("[GET /api/agents/memories]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
