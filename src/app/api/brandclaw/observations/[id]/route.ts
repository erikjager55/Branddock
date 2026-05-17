// =============================================================
// PATCH /api/brandclaw/observations/[id]
//
// Update user-flags op een StrategyObservation. Geen autonomy —
// alleen state-flags (read/acted/dismissed), geen content-mutations.
//
// Body: { action: 'markRead' | 'markActed' | 'dismiss' | 'undo', reason?: string }
//
// Workspace-isolation via Prisma where-clause: row.workspaceId moet
// matchen met sessie-workspace, anders 404.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  action: z.enum(["markRead", "markActed", "dismiss", "undo"]),
  reason: z.string().max(500).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await prisma.strategyObservation.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Observation not found" }, { status: 404 });
    }

    const now = new Date();
    const updateData: {
      markedReadAt?: Date | null;
      markedActedAt?: Date | null;
      dismissedAt?: Date | null;
      dismissReason?: string | null;
    } = {};
    switch (parsed.data.action) {
      case "markRead":
        updateData.markedReadAt = now;
        break;
      case "markActed":
        updateData.markedActedAt = now;
        // Acted impliceert read — set beide voor UI consistency.
        updateData.markedReadAt = now;
        break;
      case "dismiss":
        updateData.dismissedAt = now;
        updateData.dismissReason = parsed.data.reason ?? null;
        break;
      case "undo":
        // Undo wist alle 3 flags + reason. Voor user die per ongeluk klikt.
        updateData.markedReadAt = null;
        updateData.markedActedAt = null;
        updateData.dismissedAt = null;
        updateData.dismissReason = null;
        break;
    }

    const updated = await prisma.strategyObservation.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        markedReadAt: true,
        markedActedAt: true,
        dismissedAt: true,
        dismissReason: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/brandclaw/observations/:id]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
