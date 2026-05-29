import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assembleCanvasContext } from "@/lib/ai/canvas-context";
import { judgeVisualBrandFit } from "@/lib/landing-pages/visual-brand-fit-judge";
import type { Data } from "@puckeditor/core";

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
      { error: "Geen puckData aanwezig — genereer eerst een variant via Step 2" },
      { status: 400 },
    );
  }

  // Laad designPhilosophy + brand-context
  const styleguide = await prisma.brandStyleguide.findUnique({
    where: { workspaceId },
    select: {
      designPhilosophy: true,
      colors: {
        where: { category: "PRIMARY" },
        orderBy: { sortOrder: "asc" },
        select: { hex: true },
        take: 3,
      },
    },
  });
  if (!styleguide?.designPhilosophy) {
    return NextResponse.json(
      {
        error: "Geen designPhilosophy aanwezig — voer brandstyle-analyse uit om vision-judge te enablen",
      },
      { status: 400 },
    );
  }

  const ctx = await assembleCanvasContext(deliverable.id, workspaceId);

  const result = await judgeVisualBrandFit({
    puckData,
    ctx,
    designPhilosophy: styleguide.designPhilosophy,
    brandName: ctx.brand.brandName,
    brandColors: styleguide.colors.map((c) => c.hex),
    brandImageryStyle: ctx.brand.brandImageryStyle ?? null,
  });

  return NextResponse.json(result);
}
