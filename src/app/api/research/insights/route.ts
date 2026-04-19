import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

/**
 * GET /api/research/insights — Quick Insights for the Research Hub.
 *
 * Computes three real-data insights:
 *   1. Research depth     — fraction of brand assets + personas that completed AI Exploration
 *   2. Recent momentum    — count of method completions in the last 7 days
 *   3. Coverage breakdown — which knowledge area (brand vs personas) leads or lags
 */
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Parallel reads for performance
    const [
      brandAssetCount,
      personaCount,
      brandAssetsExplored,
      personasExplored,
      recentBrandCompletions,
      recentPersonaCompletions,
    ] = await Promise.all([
      prisma.brandAsset.count({ where: { workspaceId } }),
      prisma.persona.count({ where: { workspaceId } }),
      prisma.brandAssetResearchMethod.count({
        where: {
          method: "AI_EXPLORATION",
          status: { in: ["COMPLETED", "VALIDATED"] },
          brandAsset: { workspaceId },
        },
      }),
      prisma.personaResearchMethod.count({
        where: {
          method: "AI_EXPLORATION",
          status: { in: ["COMPLETED", "VALIDATED"] },
          persona: { workspaceId },
        },
      }),
      prisma.brandAssetResearchMethod.count({
        where: {
          completedAt: { gte: sevenDaysAgo },
          brandAsset: { workspaceId },
        },
      }),
      prisma.personaResearchMethod.count({
        where: {
          completedAt: { gte: sevenDaysAgo },
          persona: { workspaceId },
        },
      }),
    ]);

    const insights: Array<{ id: string; type: string; title: string; description: string }> = [];

    // ── 1. Research depth ────────────────────────────────
    const totalEntities = brandAssetCount + personaCount;
    const exploredEntities = brandAssetsExplored + personasExplored;
    const depthPct =
      totalEntities > 0 ? Math.round((exploredEntities / totalEntities) * 100) : 0;

    insights.push({
      id: "depth",
      type: "progress",
      title: "Research Depth",
      description:
        totalEntities === 0
          ? "Add brand assets or personas to start tracking research progress."
          : `AI Exploration is complete on ${exploredEntities} of ${totalEntities} brand assets + personas (${depthPct}%).`,
    });

    // ── 2. Recent momentum ───────────────────────────────
    const recentTotal = recentBrandCompletions + recentPersonaCompletions;
    insights.push({
      id: "momentum",
      type: "momentum",
      title: recentTotal > 0 ? "Strong Momentum" : "Time to Move",
      description:
        recentTotal === 0
          ? "No research methods completed in the last 7 days. Schedule the next exploration to keep moving."
          : `${recentTotal} research method${recentTotal === 1 ? "" : "s"} completed in the last 7 days.`,
    });

    // ── 3. Coverage breakdown ────────────────────────────
    const brandPct =
      brandAssetCount > 0 ? Math.round((brandAssetsExplored / brandAssetCount) * 100) : 0;
    const personaPct =
      personaCount > 0 ? Math.round((personasExplored / personaCount) * 100) : 0;

    let coverageDescription: string;
    if (brandAssetCount === 0 && personaCount === 0) {
      coverageDescription = "No brand assets or personas defined yet.";
    } else if (brandPct === personaPct) {
      coverageDescription = `Brand assets and personas are equally researched (${brandPct}% each).`;
    } else if (brandPct > personaPct) {
      coverageDescription = `Brand foundation (${brandPct}%) is ahead of persona research (${personaPct}%) — add persona explorations to balance.`;
    } else {
      coverageDescription = `Personas (${personaPct}%) are ahead of brand foundation (${brandPct}%) — explore brand assets to balance.`;
    }

    insights.push({
      id: "coverage",
      type: "balance",
      title: "Coverage Balance",
      description: coverageDescription,
    });

    return NextResponse.json({ insights });
  } catch (error) {
    console.error("[GET /api/research/insights]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
