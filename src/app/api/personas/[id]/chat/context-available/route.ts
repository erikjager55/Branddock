import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { getAvailableContextItems, type ContextGroup } from "@/lib/ai/context/fetcher";

interface StrategicImplication {
  category: string;
  title: string;
  description: string;
  priority: string;
}

function parseImplications(raw: string | null): StrategicImplication[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].category) {
      return parsed;
    }
  } catch {
    // Not JSON
  }
  return null;
}

// ─── GET /api/personas/[id]/chat/context-available ───────────
// Fetch all available knowledge items for the context selector.
// Uses the dynamic context registry — new types are auto-discovered.
// Also includes strategic implications from the current persona.
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

    // Verify persona exists and fetch strategic implications
    const { id: personaId } = await params;
    const persona = await prisma.persona.findFirst({
      where: { id: personaId, workspaceId },
      select: { id: true, name: true, strategicImplications: true },
    });
    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // Dynamically fetch all available context items via registry
    const groups = await getAvailableContextItems(workspaceId);

    // Add strategic implications as a group if they exist
    const implications = parseImplications(persona.strategicImplications);
    if (implications && implications.length > 0) {
      const implGroup: ContextGroup = {
        key: 'strategic_implication',
        label: 'Strategic Implications',
        icon: 'TrendingUp',
        category: 'strategy',
        items: implications.map((impl, idx) => ({
          sourceType: 'strategic_implication',
          sourceId: `${personaId}:${idx}`,
          title: `${impl.category}: ${impl.title}`,
          description: impl.description,
          status: impl.priority,
        })),
      };
      groups.push(implGroup);
    }

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("[GET /api/personas/:id/chat/context-available]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
