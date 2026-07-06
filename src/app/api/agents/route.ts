// =============================================================
// GET /api/agents — de agent-catalogus voor de UI.
//
// De code-registry (listAgents) is server-only (trekt via de tool-
// bootstrap prisma/claw-tools mee) — de client-side catalogus haalt de
// publieke velden dus hier op. Alleen niet-gevoelige definitie-data:
// system-prompts en tool-sets blijven server-side.
// =============================================================

import { NextResponse } from "next/server";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { listAgents } from "@/lib/agents/registry";

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agents = listAgents().map((def) => ({
      id: def.id,
      persona: def.persona,
      useCases: def.useCases.map((u) => ({ id: u.id, label: u.label })),
    }));

    // Registry is code-based en per-deploy statisch — cachen is onnodig.
    return NextResponse.json({ agents });
  } catch (err) {
    console.error("[GET /api/agents]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
