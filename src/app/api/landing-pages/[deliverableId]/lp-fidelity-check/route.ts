import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assembleCanvasContext } from "@/lib/ai/canvas-context";
import { judgeLpFidelity, type LpFidelityResult } from "@/lib/landing-pages/lp-fidelity-judge";
import { judgeVisualBrandFit } from "@/lib/landing-pages/visual-brand-fit-judge";
import { capturePuckTreeScreenshot } from "@/lib/landing-pages/lp-screenshotter";
import { fetchMediaAsBuffer } from "@/lib/storage/fetch-media-buffer";
import type { Data } from "@puckeditor/core";

/** Verdict-bucket uit een 0-100 score — zelfde grenzen als de side-by-side judge. */
function verdictForScore(score: number): LpFidelityResult["verdict"] {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

/**
 * POST /api/landing-pages/[deliverableId]/lp-fidelity-check
 *
 * Fase D — fidelity-judge: side-by-side vergelijking van de gegenereerde
 * LP-hero met de bron-website hero-screenshot. Returnt composite-score
 * 0-100 + per-dimensie scores + mismatch-feedback.
 *
 * Vereisten:
 *   - BRANDSTYLE_LP_FIDELITY=1 env-var (gate kosten van extra vision-call)
 *   - styleguide.visualLanguage.heroScreenshotUrl (gepersist tijdens scrape)
 *   - deliverable.settings.puckData (gegenereerd via Step 2)
 *
 * Cost: ~$0.02 per call (Anthropic 2-image vision input).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  // Env-gate verwijderd — fidelity-check is een conscious user-action via
  // de 'Brand-fit check'-knop in canvas-UI, niet een automatic cron-call.
  // Kosten (~$0.02 per click) zijn acceptable voor manuele check.
  const { deliverableId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    select: {
      id: true,
      settings: true,
      campaign: { select: { workspaceId: true } },
    },
  });
  if (!deliverable) {
    return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
  }
  const workspaceId = deliverable.campaign.workspaceId;

  // Workspace-membership-check
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organization: { workspaces: { some: { id: workspaceId } } },
    },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "No access to this workspace" }, { status: 403 });
  }

  const settings =
    deliverable.settings && typeof deliverable.settings === "object" && !Array.isArray(deliverable.settings)
      ? (deliverable.settings as Record<string, unknown>)
      : {};
  const puckData = settings.puckData as Data | undefined;
  if (!puckData || typeof puckData !== "object") {
    return NextResponse.json(
      { error: "No puckData present — generate a variant via Step 2 first" },
      { status: 400 },
    );
  }

  // Load bron-hero-screenshot URL + fallback-velden (designPhilosophy) uit de
  // styleguide. De bron-hero is de side-by-side referentie; designPhilosophy
  // voedt de tekstuele fallback-judge wanneer die referentie ontbreekt.
  const styleguide = await prisma.brandStyleguide.findUnique({
    where: { workspaceId },
    select: {
      visualLanguage: true,
      designPhilosophy: true,
      colors: { where: { category: "PRIMARY" }, orderBy: { sortOrder: "asc" }, select: { hex: true }, take: 3 },
    },
  });
  const heroScreenshotUrl = (() => {
    const vl = styleguide?.visualLanguage as { heroScreenshotUrl?: string } | null;
    return vl?.heroScreenshotUrl ?? null;
  })();

  // Render LP-screenshot (nodig voor beide paden).
  const ctx = await assembleCanvasContext(deliverable.id, workspaceId);
  const lpScreenshot = await capturePuckTreeScreenshot(puckData, ctx);
  if (!lpScreenshot) {
    return NextResponse.json(
      { error: "LP screenshot render failed — see server logs ([lp-screenshotter])" },
      { status: 500 },
    );
  }

  // Probeer de bron-hero-screenshot te laden. heroScreenshotUrl is doorgaans een
  // lokaal storage-pad ("/uploads/media/…"); fetchMediaAsBuffer leest relatieve
  // paden van disk. Ontbreekt de URL OF is het bestand weg (orphaned scrape-asset
  // → ENOENT), dan vallen we terug op de tekstuele design-philosophy-judge i.p.v.
  // een harde fout — de "Brand-fit check"-knop levert zo altijd een oordeel.
  let sourceHeroBuffer: Buffer | null = null;
  if (heroScreenshotUrl) {
    try {
      sourceHeroBuffer = await fetchMediaAsBuffer(heroScreenshotUrl, "bron-screenshot");
    } catch (err) {
      console.warn(
        `[lp-fidelity-check] bron-screenshot niet beschikbaar (${err instanceof Error ? err.message : String(err)}) — fallback naar design-philosophy-judge`,
      );
    }
  }

  let result: LpFidelityResult;
  if (sourceHeroBuffer) {
    // Pad 1 — side-by-side vergelijking met de bron-hero.
    const sideBySide = await judgeLpFidelity({
      lpScreenshot,
      sourceHeroScreenshot: sourceHeroBuffer,
      brandName: ctx.brand.brandName,
    });
    if (!sideBySide) {
      return NextResponse.json(
        { error: "Fidelity judge failed (see server logs)" },
        { status: 500 },
      );
    }
    result = sideBySide;
  } else {
    // Pad 2 — fallback: tekstuele design-philosophy-judge (geen bron-image).
    if (!styleguide?.designPhilosophy) {
      return NextResponse.json(
        {
          error:
            "No source hero screenshot and no design philosophy available — re-run the brand style analysis to be able to run the brand-fit check.",
        },
        { status: 400 },
      );
    }
    const fit = await judgeVisualBrandFit({
      screenshotBuffer: lpScreenshot,
      designPhilosophy: styleguide.designPhilosophy,
      brandName: ctx.brand.brandName,
      brandColors: styleguide.colors.map((c) => c.hex),
      brandImageryStyle: ctx.brand.brandImageryStyle ?? null,
    });
    if (fit.status !== "scored" || typeof fit.score !== "number") {
      return NextResponse.json(
        { error: `Brand-fit judge failed (status: ${fit.status})` },
        { status: 500 },
      );
    }
    // Map naar het LpFidelityResult-shape dat de UI verwacht (score/verdict/
    // reasoning/mismatches). Dimensies zijn niet beschikbaar in de tekstuele
    // judge → de composite-score op alle vier zodat de UI niet leeg toont.
    result = {
      score: fit.score,
      dimensions: {
        colorDiscipline: fit.score,
        typographyFeel: fit.score,
        layoutDensity: fit.score,
        overallVibe: fit.score,
      },
      mismatches: [],
      reasoning: `${fit.reasoning ?? ""} (Assessed against brand DNA — no source screenshot available for a side-by-side comparison.)`.trim(),
      verdict: verdictForScore(fit.score),
    };
  }

  // Persist resultaat in deliverable.settings voor later inspecteren / UI
  await prisma.deliverable.update({
    where: { id: deliverableId },
    data: {
      settings: {
        ...settings,
        lpFidelity: {
          ...result,
          scoredAt: new Date().toISOString(),
        },
      },
    },
  });

  return NextResponse.json(result);
}
