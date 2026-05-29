import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { cachedJson, setCache } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";

const querySchema = z.object({
  window: z.enum(["7d", "30d"]).default("7d"),
});

// GET /api/competitors/activity-summary
//
// Workspace-wide aggregaten van competitor-activities binnen `window`:
//   - totals: counts per severity (alleen unack'd — consistent met topEvents/
//     hotCompetitors zodat de digest-skip-gate en de renderbare secties dezelfde
//     populatie tellen; anders rendert een all-ack'd window een half-lege kaart)
//   - topEvents: top 20 unack'd events, severity-desc dan detectedAt-desc
//   - hotCompetitors: top 5 competitors gerangschikt op unack'd-count
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const { window } = parsed.data;

    const cacheKey = `${cacheKeys.competitors.activity(workspaceId)}:summary:${window}`;
    const hit = cachedJson(cacheKey);
    if (hit) return hit;

    const days = window === "30d" ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [topEvents, severityGroups, competitorGroups] = await Promise.all([
      prisma.competitorActivity.findMany({
        where: { workspaceId, detectedAt: { gte: since }, acknowledgedAt: null },
        orderBy: [{ severity: "desc" }, { detectedAt: "desc" }],
        take: 20,
        include: {
          competitor: { select: { id: true, name: true, logoUrl: true } },
        },
      }),
      prisma.competitorActivity.groupBy({
        by: ["severity"],
        _count: { _all: true },
        where: { workspaceId, detectedAt: { gte: since }, acknowledgedAt: null },
      }),
      prisma.competitorActivity.groupBy({
        by: ["competitorId"],
        _count: { _all: true },
        where: { workspaceId, detectedAt: { gte: since }, acknowledgedAt: null },
        orderBy: { _count: { competitorId: "desc" } },
        take: 5,
      }),
    ]);

    const totals = { major: 0, notable: 0, info: 0 };
    for (const g of severityGroups) {
      if (g.severity === "MAJOR") totals.major = g._count._all;
      else if (g.severity === "NOTABLE") totals.notable = g._count._all;
      else if (g.severity === "INFO") totals.info = g._count._all;
    }

    const hotCompetitorIds = competitorGroups.map((g) => g.competitorId);
    const hotCompetitorRows = hotCompetitorIds.length
      ? await prisma.competitor.findMany({
          where: { id: { in: hotCompetitorIds }, workspaceId },
          select: { id: true, name: true, logoUrl: true },
        })
      : [];
    const hotCompetitorMap = new Map(hotCompetitorRows.map((c) => [c.id, c]));
    const hotCompetitors = competitorGroups
      .map((g) => {
        const c = hotCompetitorMap.get(g.competitorId);
        if (!c) return null;
        return {
          id: c.id,
          name: c.name,
          logoUrl: c.logoUrl,
          unackCount: g._count._all,
        };
      })
      .filter((x): x is { id: string; name: string; logoUrl: string | null; unackCount: number } => x !== null);

    const responseData = {
      window,
      totals,
      topEvents: topEvents.map((a) => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        summary: a.summary,
        detectedAt: a.detectedAt.toISOString(),
        detectionMethod: a.detectionMethod,
        confidence: a.confidence,
        snapshotId: a.snapshotId,
        diffPayload: a.diffPayload,
        acknowledgedAt: null,
        acknowledgedBy: null,
        competitor: {
          id: a.competitor.id,
          name: a.competitor.name,
          logoUrl: a.competitor.logoUrl,
        },
      })),
      hotCompetitors,
    };

    setCache(cacheKey, responseData, CACHE_TTL.DASHBOARD);
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[GET /api/competitors/activity-summary]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
