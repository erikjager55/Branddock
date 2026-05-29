import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assembleCanvasContext } from "@/lib/ai/canvas-context";
import { variantToPuckDataFromStructured } from "@/features/campaigns/components/canvas/medium/variant-to-puck-data";
import type { LandingPageVariantContent } from "@/lib/landing-pages/variant-schema";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

/**
 * POST /api/landing-pages/[deliverableId]/regenerate-puck-data
 *
 * Verbeterplan #3: regenereert deliverable.settings.puckData uit de
 * gepersisteerde structuredVariant + huidige BrandTokens v4. Gebruikt voor:
 *   - Re-applicatie van geüpdate BrandStyleguide profiles (na re-scrape)
 *   - Recovery van puckData wanneer mapper-changes zijn doorgevoerd
 *     (bv. heroVisualUrl-mapping fix uit eerdere commits)
 *
 * Behoudt structuredVariant — alleen de Puck-tree wordt opnieuw gemapt.
 * User-bewerkingen in puckData die afwijken van structuredVariant gaan
 * verloren — vandaar een expliciet endpoint i.p.v. auto-trigger.
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
      contentType: true,
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
  const structuredVariant = settings.structuredVariant as LandingPageVariantContent | undefined;
  if (!structuredVariant || typeof structuredVariant !== "object") {
    return NextResponse.json(
      { error: "Geen structuredVariant aanwezig om uit te regenereren" },
      { status: 400 },
    );
  }

  // Verzamel context-stack — bevat huidige BrandTokens (incl. v4 sub-shapes)
  const ctx = await assembleCanvasContext(deliverable.id, workspaceId);
  const newPuckData = variantToPuckDataFromStructured(structuredVariant, ctx);

  await prisma.deliverable.update({
    where: { id: deliverableId },
    data: {
      settings: {
        ...settings,
        puckData: newPuckData,
        puckRegeneratedAt: new Date().toISOString(),
      },
    },
  });

  invalidateCache(cacheKeys.prefixes.studio(workspaceId));
  invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));

  return NextResponse.json({ ok: true, puckData: newPuckData });
}
