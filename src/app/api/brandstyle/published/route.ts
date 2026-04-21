import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, requireAuth } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { getApplicableReviewSections } from "@/lib/brandstyle/review-sections";

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
      select: {
        id: true,
        semanticColors: true,
        colors: { select: { category: true } },
        // Needed by getApplicableReviewSections to skip empty typography
        // roles (DISPLAY/UI/EYEBROW without a font) and empty component
        // types — otherwise publish gate blocks on reviews that aren't
        // even rendered in the UI.
        fonts: { select: { role: true } },
        components: { select: { type: true } },
      },
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
      // Dynamic filter: sections like semantic tints / empty font roles
      // / component types with zero samples are only active when the
      // styleguide actually has the data for them — don't gate publish
      // behind an empty panel the user can't approve anyway.
      const activeSections = getApplicableReviewSections(styleguide);
      const reviews = await prisma.styleguideReview.findMany({
        where: {
          styleguideId: styleguide.id,
          section: { in: activeSections },
        },
        select: { section: true, status: true },
      });
      // Publish allowed when every active section has a REVIEW DECISION
      // (APPROVED or NEEDS_WORK). Pure PENDING sections are the ones
      // that still block — those are "I haven't looked at this yet".
      // Needs-work sections don't block because flagging IS a decision.
      const reviewedSet = new Set(
        reviews
          .filter((r) => r.status === "APPROVED" || r.status === "NEEDS_WORK")
          .map((r) => r.section),
      );
      const pending = activeSections.filter((s) => !reviewedSet.has(s));
      if (pending.length > 0) {
        return NextResponse.json(
          {
            error: "Not all sections have been reviewed",
            missingSections: pending,
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
