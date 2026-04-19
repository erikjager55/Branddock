import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

/**
 * GET /api/research/recommended-actions — surface the 3 most actionable next steps.
 *
 * Heuristics (in priority order):
 *   1. Brand asset with no AI Exploration started yet → "Start AI Exploration on X"
 *   2. Persona with no AI Exploration started yet → "Explore X persona"
 *   3. Active business strategy with no objectives → "Define objectives for X"
 *
 * Returns up to 3 actions; falls back to a single "All caught up" message
 * when nothing meaningful is open.
 */
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const actions: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      targetRoute: string;
    }> = [];

    // ── 1. Brand asset without AI Exploration started ─────
    const unexploredAsset = await prisma.brandAsset.findFirst({
      where: {
        workspaceId,
        researchMethods: {
          none: {
            method: "AI_EXPLORATION",
            status: { in: ["IN_PROGRESS", "COMPLETED", "VALIDATED"] },
          },
        },
      },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" }, // oldest unfinished first
    });

    if (unexploredAsset) {
      actions.push({
        id: `ra-asset-${unexploredAsset.id}`,
        type: "brand",
        title: `Start AI Exploration on ${unexploredAsset.name}`,
        description:
          "This brand asset has no exploration in progress — running it surfaces strategic insights and field suggestions.",
        targetRoute: "brand",
      });
    }

    // ── 2. Persona without AI Exploration started ─────────
    const unexploredPersona = await prisma.persona.findFirst({
      where: {
        workspaceId,
        researchMethods: {
          none: {
            method: "AI_EXPLORATION",
            status: { in: ["IN_PROGRESS", "COMPLETED", "VALIDATED"] },
          },
        },
      },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    });

    if (unexploredPersona) {
      actions.push({
        id: `ra-persona-${unexploredPersona.id}`,
        type: "persona",
        title: `Explore ${unexploredPersona.name} persona`,
        description:
          "AI Exploration deepens this persona's psychographics, motivations, and decision criteria.",
        targetRoute: "personas",
      });
    }

    // ── 3. Active strategy without objectives ─────────────
    const emptyStrategy = await prisma.businessStrategy.findFirst({
      where: {
        workspaceId,
        status: "ACTIVE",
        objectives: { none: {} },
      },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    });

    if (emptyStrategy) {
      actions.push({
        id: `ra-strategy-${emptyStrategy.id}`,
        type: "strategy",
        title: `Define objectives for ${emptyStrategy.name}`,
        description:
          "This active strategy has no objectives yet — add them to track progress and link campaigns.",
        targetRoute: "business-strategy",
      });
    }

    // Fallback when everything is in good shape
    if (actions.length === 0) {
      actions.push({
        id: "ra-clean",
        type: "info",
        title: "All caught up",
        description:
          "No open exploration, persona, or strategy gaps detected. Consider validating completed work or adding new knowledge resources.",
        targetRoute: "knowledge",
      });
    }

    return NextResponse.json({ actions });
  } catch (error) {
    console.error("[GET /api/research/recommended-actions]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
