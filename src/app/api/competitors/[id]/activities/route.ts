import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CompetitorActivityType, ActivitySeverity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

const DETECTION_METHODS = ["hash-diff", "ai-classified", "manual", "rss-feed"] as const;

const querySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  severity: z.nativeEnum(ActivitySeverity).optional(),
  type: z.nativeEnum(CompetitorActivityType).optional(),
  detectionMethod: z.enum(DETECTION_METHODS).optional(),
});

// GET /api/competitors/:id/activities
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const competitor = await prisma.competitor.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!competitor) {
      return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const { offset, limit, severity, type, detectionMethod } = parsed.data;

    const where = {
      competitorId: id,
      ...(severity ? { severity } : {}),
      ...(type ? { type } : {}),
      ...(detectionMethod ? { detectionMethod } : {}),
    };

    // unreadCount is filter-scoped (matches the visible list); totalUnread is the
    // unfiltered unread total for this competitor — the "Mark all as read" action
    // acknowledges every unread activity regardless of the active filter, so the
    // badge + enable-gate must reflect this global count, not the filtered slice.
    const [items, total, unreadCount, totalUnread] = await Promise.all([
      prisma.competitorActivity.findMany({
        where,
        orderBy: { detectedAt: "desc" },
        skip: offset,
        take: limit,
        include: {
          acknowledgedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.competitorActivity.count({ where }),
      prisma.competitorActivity.count({ where: { ...where, acknowledgedAt: null } }),
      prisma.competitorActivity.count({ where: { competitorId: id, acknowledgedAt: null } }),
    ]);

    return NextResponse.json({
      items: items.map((a) => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        summary: a.summary,
        detectedAt: a.detectedAt.toISOString(),
        detectionMethod: a.detectionMethod,
        confidence: a.confidence,
        snapshotId: a.snapshotId,
        diffPayload: a.diffPayload,
        acknowledgedAt: a.acknowledgedAt?.toISOString() ?? null,
        acknowledgedBy: a.acknowledgedBy
          ? { id: a.acknowledgedBy.id, name: a.acknowledgedBy.name }
          : null,
      })),
      total,
      unreadCount,
      totalUnread,
    });
  } catch (error) {
    console.error("[GET /api/competitors/:id/activities]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
