import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

const bodySchema = z.union([
  z.object({ activityIds: z.array(z.string().min(1)).min(1).max(200) }),
  z.object({ all: z.literal(true) }),
]);

// POST /api/competitors/:id/activities/acknowledge
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const competitor = await prisma.competitor.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!competitor) {
      return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
    }

    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const where = {
      competitorId: id,
      acknowledgedAt: null,
      ...("activityIds" in parsed.data ? { id: { in: parsed.data.activityIds } } : {}),
    };

    const acknowledgedCount = await prisma.$transaction(async (tx) => {
      const result = await tx.competitorActivity.updateMany({
        where,
        data: {
          acknowledgedAt: new Date(),
          acknowledgedById: session.user.id,
        },
      });
      if (result.count > 0) {
        await tx.competitor.update({
          where: { id },
          data: { unacknowledgedActivityCount: { decrement: result.count } },
        });
      }
      return result.count;
    });

    invalidateCache(cacheKeys.prefixes.competitors(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ acknowledgedCount });
  } catch (error) {
    console.error("[POST /api/competitors/:id/activities/acknowledge]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
