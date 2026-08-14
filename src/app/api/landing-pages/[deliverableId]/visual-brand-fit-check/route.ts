import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assembleCanvasContext } from "@/lib/ai/canvas-context";
import { judgeVisualBrandFit } from "@/lib/landing-pages/visual-brand-fit-judge";
import type { PageData as Data } from '@/lib/landing-pages/page-data';
import { getBrandLibrary } from '@/lib/brand-library';

/**
 * POST /api/landing-pages/[deliverableId]/visual-brand-fit-check
 *
 * F-VAL dimensie 8 — handmatige trigger van de vision-judge voor een
 * deliverable. Rendert puckData via Playwright + Claude vision API +
 * returnt score 0-100 met reasoning.
 *
 * Wordt automatisch geblend in F-VAL composite via auto-iterate route
 * (10% gewicht); deze endpoint is voor handmatige Step 3 "check"-knop OF
 * voor admin-debug-tools.
 *
 * Body: geen (gebruikt huidige deliverable.settings.puckData).
 * Cost: ~$0.01 per call (Anthropic vision input).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
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

  // Laad designPhilosophy + brand-context via het consumptiepad (W7.1).
  // designPhilosophy komt marker-vrij binnen; voorheen ging de ruwe
  // OBSERVED:-tekst als beoordelingsmaatstaf de vision-judge in.
  const library = await getBrandLibrary(workspaceId, { view: "image" });
  const primaryHexes = library.render.colors
    .filter((c) => c.category === "PRIMARY")
    .slice(0, 3)
    .map((c) => c.hex);
  if (!library.meta.designPhilosophy) {
    return NextResponse.json(
      {
        error: "No designPhilosophy present — run the brand style analysis to enable the vision judge",
      },
      { status: 400 },
    );
  }

  const ctx = await assembleCanvasContext(deliverable.id, workspaceId);

  const result = await judgeVisualBrandFit({
    puckData,
    ctx,
    designPhilosophy: library.meta.designPhilosophy,
    brandName: ctx.brand.brandName,
    brandColors: primaryHexes,
    brandImageryStyle: ctx.brand.brandImageryStyle ?? null,
  });

  return NextResponse.json(result);
}
