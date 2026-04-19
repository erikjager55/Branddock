import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, requireAuth } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { isValidReviewSection } from "@/lib/brandstyle/review-sections";

type RouteContext = { params: Promise<{ section: string }> };

const updateSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "NEEDS_WORK"]),
  feedback: z.string().max(2000).nullable().optional(),
  referenceImageUrl: z.string().max(1024).nullable().optional(),
});

// =============================================================
// PATCH /api/brandstyle/review/[section] — upsert a review record
//
// Auto-unpublishes the styleguide if any section moves away from APPROVED.
// =============================================================
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

    const { section } = await context.params;
    if (!isValidReviewSection(section)) {
      return NextResponse.json({ error: `Unknown review section: ${section}` }, { status: 400 });
    }

    const styleguide = await prisma.brandStyleguide.findUnique({
      where: { workspaceId },
      select: { id: true, published: true },
    });
    if (!styleguide) {
      return NextResponse.json({ error: "No styleguide found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const review = await prisma.styleguideReview.upsert({
      where: {
        styleguideId_section: {
          styleguideId: styleguide.id,
          section,
        },
      },
      create: {
        styleguideId: styleguide.id,
        workspaceId,
        section,
        status: data.status,
        feedback: data.feedback ?? null,
        referenceImageUrl: data.referenceImageUrl ?? null,
        reviewedById: session.user.id,
      },
      update: {
        status: data.status,
        feedback: data.feedback ?? null,
        referenceImageUrl: data.referenceImageUrl ?? null,
        reviewedById: session.user.id,
      },
    });

    // Un-publish if a section was marked non-APPROVED after previously being published
    if (data.status !== "APPROVED" && styleguide.published) {
      await prisma.brandStyleguide.update({
        where: { id: styleguide.id },
        data: { published: false, publishedAt: null },
      });
    }

    invalidateCache(cacheKeys.prefixes.brandstyle(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ review });
  } catch (error) {
    console.error("[PATCH /api/brandstyle/review/:section]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
