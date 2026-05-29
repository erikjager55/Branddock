import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assembleCanvasContext } from "@/lib/ai/canvas-context";
import { judgeLpFidelity } from "@/lib/landing-pages/lp-fidelity-judge";
import { capturePuckTreeScreenshot } from "@/lib/landing-pages/lp-screenshotter";
import type { Data } from "@puckeditor/core";

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
      { error: "Geen puckData aanwezig — genereer eerst een variant via Step 2" },
      { status: 400 },
    );
  }

  // Load bron hero-screenshot URL uit styleguide.visualLanguage
  const styleguide = await prisma.brandStyleguide.findUnique({
    where: { workspaceId },
    select: { visualLanguage: true },
  });
  const heroScreenshotUrl = (() => {
    const vl = styleguide?.visualLanguage as { heroScreenshotUrl?: string } | null;
    return vl?.heroScreenshotUrl ?? null;
  })();
  if (!heroScreenshotUrl) {
    return NextResponse.json(
      {
        error:
          "Geen bron-hero-screenshot beschikbaar — voer brandstyle-analyse opnieuw uit (vereist BRANDSTYLE_VISUAL_AI=1)",
      },
      { status: 400 },
    );
  }

  // Fetch bron-screenshot als buffer
  let sourceHeroBuffer: Buffer;
  try {
    const res = await fetch(heroScreenshotUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    sourceHeroBuffer = Buffer.from(arrayBuf);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Kon bron-screenshot niet ophalen: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 502 },
    );
  }

  // Render LP-screenshot
  const ctx = await assembleCanvasContext(deliverable.id, workspaceId);
  const lpScreenshot = await capturePuckTreeScreenshot(puckData, ctx);
  if (!lpScreenshot) {
    return NextResponse.json(
      { error: "LP-screenshot capture mislukt — Playwright niet beschikbaar?" },
      { status: 500 },
    );
  }

  // Run judge
  const result = await judgeLpFidelity({
    lpScreenshot,
    sourceHeroScreenshot: sourceHeroBuffer,
    brandName: ctx.brand.brandName,
  });
  if (!result) {
    return NextResponse.json(
      { error: "Fidelity-judge faalde (zie server logs)" },
      { status: 500 },
    );
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
