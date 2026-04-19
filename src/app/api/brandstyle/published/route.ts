import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, requireAuth } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { ACTIVE_REVIEW_SECTIONS } from "@/lib/brandstyle/review-sections";

const publishSchema = z.object({ published: z.boolean() });

// =============================================================
// PATCH /api/brandstyle/published — toggle published state
//
// Rejects publish attempts when any active section is not APPROVED.
// Unpublish is always allowed.
// =============================================================
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

    const styleguide = await prisma.brandStyleguide.findUnique({
      where: { workspaceId },
      select: { id: true },
    });
    if (!styleguide) {
      return NextResponse.json({ error: "No styleguide found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.published === true) {
      const reviews = await prisma.styleguideReview.findMany({
        where: {
          styleguideId: styleguide.id,
          section: { in: [...ACTIVE_REVIEW_SECTIONS] },
        },
        select: { section: true, status: true },
      });
      const approvedSet = new Set(
        reviews.filter((r) => r.status === "APPROVED").map((r) => r.section),
      );
      const missing = ACTIVE_REVIEW_SECTIONS.filter((s) => !approvedSet.has(s));
      if (missing.length > 0) {
        return NextResponse.json(
          {
            error: "Not all sections are approved",
            missingSections: missing,
          },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.brandStyleguide.update({
      where: { id: styleguide.id },
      data: {
        published: parsed.data.published,
        publishedAt: parsed.data.published ? new Date() : null,
      },
      select: { id: true, published: true, publishedAt: true },
    });

    invalidateCache(cacheKeys.prefixes.brandstyle(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({
      published: updated.published,
      publishedAt: updated.publishedAt,
    });
  } catch (error) {
    console.error("[PATCH /api/brandstyle/published]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
