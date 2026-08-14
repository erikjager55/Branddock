import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { clearStyleguideRuleCache } from "@/lib/brand-fidelity/styleguide-rule-compiler";
import { syncStructuredVoiceRules } from "@/lib/brandstyle/rule-structurer";
import { staleReviewsToCalibrationInput } from "@/lib/brandstyle/review-sections";
import { cacheKeys } from "@/lib/api/cache-keys";
import { buildBrandstyleCalibrationReport } from "@/lib/brandstyle/calibration-report";

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
      select: {
        id: true,
        typeScale: true,
        colors: { select: { confidence: true, category: true } },
        fonts: { select: { source: true, availability: true, fileUrl: true } },
        logos: { select: { variant: true } },
        reviews: { select: { section: true, staleAt: true } },
      },
    });
    if (!styleguide) {
      return NextResponse.json({ error: "No styleguide found" }, { status: 404 });
    }

    // W5 zachte gate: kritieke kalibratie-issues blokkeren finalize niet
    // ("I'm done, stop asking me" blijft gelden) maar reizen mee in de
    // response zodat de UI ze kan tonen — publish bepaalt immers wat álle
    // AI-generatie als merkcontext krijgt.
    const calibration = buildBrandstyleCalibrationReport({
      colors: styleguide.colors,
      fonts: styleguide.fonts,
      logos: styleguide.logos,
      typeScaleCount: Array.isArray(styleguide.typeScale)
        ? styleguide.typeScale.length
        : undefined,
      staleReviews: staleReviewsToCalibrationInput(styleguide.reviews),
    });
    const criticalWarnings = calibration.asks.filter((a) => a.severity === "critical");

    await prisma.$transaction([
      prisma.styleguideReview.deleteMany({ where: { styleguideId: styleguide.id } }),
      prisma.brandStyleguide.update({
        where: { id: styleguide.id },
        data: { published: true, publishedAt: new Date() },
      }),
    ]);

    invalidateCache(cacheKeys.prefixes.brandstyle(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));
    clearStyleguideRuleCache(workspaceId);

    // Publiceren is het moment waarop de merkcontext geldig wordt; leid dan
    // ook de afdwingbare tekst-regels af uit de schrijfrichtlijnen. Fail-soft:
    // een gefaalde classificatie (AI-fout, timeout) mag een finalize nooit
    // afschieten — de styleguide is dan al gepubliceerd.
    let voiceRulesDerived = 0;
    try {
      const sync = await syncStructuredVoiceRules(workspaceId);
      voiceRulesDerived = sync.written;
    } catch (err) {
      console.error("[POST /api/brandstyle/finalize] voice-rule-sync mislukt (non-fataal)", err);
    }

    return NextResponse.json({ success: true, warnings: criticalWarnings, voiceRulesDerived });
  } catch (error) {
    console.error("[POST /api/brandstyle/finalize]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
