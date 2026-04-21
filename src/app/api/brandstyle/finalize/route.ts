import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

// =============================================================
// POST /api/brandstyle/finalize — close the review and finalize
//
// Flips `published = true` AND deletes every StyleguideReview record
// for this styleguide. After this, the review UI (top summary card +
// per-section thumbs) disappears — the styleguide is "done".
//
// No review-completeness gate: this is the "I'm done, stop asking me"
// action. Users who want to re-review should kick off a fresh analysis.
// =============================================================
export async function POST() {
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

    await prisma.$transaction([
      prisma.styleguideReview.deleteMany({ where: { styleguideId: styleguide.id } }),
      prisma.brandStyleguide.update({
        where: { id: styleguide.id },
        data: { published: true, publishedAt: new Date() },
      }),
    ]);

    invalidateCache(cacheKeys.prefixes.brandstyle(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/brandstyle/finalize]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
