import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assembleCanvasContext } from "@/lib/ai/canvas-context";
import { generateLandingPageVariant } from "@/lib/landing-pages/variant-generator";
import { variantToPuckDataFromStructured } from "@/features/campaigns/components/canvas/medium/variant-to-puck-data";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

/**
 * POST /api/landing-pages/[deliverableId]/generate-structured-variant
 *
 * Fase 6a wiring (web-page-builder spec §4b paradigma B): genereer 1
 * gestructureerd LandingPageVariantContent via Anthropic + sla op in
 * deliverable.settings.structuredVariant + map naar Puck-tree in
 * deliverable.settings.puckData.
 *
 * Vervangt voor PUCK_WEBPAGE_TYPES content-types de multi-variant flow van
 * /api/studio/[id]/orchestrate. Single variant is bewuste keuze (spec §4d
 * F-VAL gate scoort 1 page; auto-iterate doet refinement op puck-data).
 *
 * Body:
 *   - userPrompt: string (verplicht, min 5 tekens — wat moet de pagina bereiken)
 *   - includeProblem?: boolean (default true)
 *   - includePricing?: boolean (default false)
 *
 * Returns:
 *   - variant: LandingPageVariantContent (gevalideerd)
 *   - puckData: Puck-tree (klaar voor Step 3)
 *   - retried: boolean (true als generator een retry deed op validation-fail)
 *   - inputTokens + outputTokens (cost-tracking)
 *
 * Failure-modes:
 *   - Auth/membership/deliverable-not-found → 4xx
 *   - Anthropic generation-fail na retry → 502
 *   - Validation-fail die niet via retry herstelt → caught + 502
 */

interface RequestBody {
  userPrompt?: string;
  includeProblem?: boolean;
  includePricing?: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  const { deliverableId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userPrompt = body.userPrompt?.trim() ?? "";
  if (userPrompt.length < 5) {
    return NextResponse.json(
      { error: "userPrompt must be at least 5 characters" },
      { status: 400 },
    );
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

  // Verifieer dat dit een PUCK-webpage type is — voor alle andere types
  // hoort de generator niet aangeroepen te worden (spec §4b is type-specific).
  const PUCK_WEBPAGE_TYPES = new Set([
    "landing-page",
    "product-page",
    "faq-page",
    "comparison-page",
    "microsite",
  ]);
  if (!PUCK_WEBPAGE_TYPES.has(deliverable.contentType)) {
    return NextResponse.json(
      {
        error: `Content-type ${deliverable.contentType} ondersteunt geen structured variant generation`,
      },
      { status: 400 },
    );
  }

  // Brand + persona context uit canvas-context (5-min cache)
  const ctx = await assembleCanvasContext(deliverable.id, workspaceId);

  const primaryPersona = ctx.personas[0];
  const personaForGenerator = primaryPersona
    ? {
        name: primaryPersona.name,
        serialized: primaryPersona.serialized,
      }
    : undefined;

  let result;
  try {
    result = await generateLandingPageVariant({
      brand: ctx.brand,
      persona: personaForGenerator,
      userPrompt,
      locale: "nl-NL",
      includeProblem: body.includeProblem ?? true,
      includePricing: body.includePricing ?? false,
    });
  } catch (err) {
    console.error("[generate-structured-variant] Generator failed", err);
    return NextResponse.json(
      {
        error: "Variant generation failed after retry",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  // Map structured → Puck-tree zodat Step 3 direct kan rendren
  const puckData = variantToPuckDataFromStructured(result.variant, ctx);

  // Persist beide in settings JSON-blob (geen schema-migratie nodig)
  const existingSettings =
    deliverable.settings && typeof deliverable.settings === "object" && !Array.isArray(deliverable.settings)
      ? (deliverable.settings as Record<string, unknown>)
      : {};

  await prisma.deliverable.update({
    where: { id: deliverableId },
    data: {
      settings: {
        ...existingSettings,
        structuredVariant: result.variant,
        puckData,
        structuredGenerationMeta: {
          generatedAt: new Date().toISOString(),
          retried: result.retried,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        },
      },
    },
  });

  // Cache-invalidatie per CLAUDE.md API conventies (verplicht na mutatie)
  // Studio + campaigns prefixes — beide raken deliverable-mutations
  invalidateCache(cacheKeys.prefixes.studio(workspaceId));
  invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));

  return NextResponse.json({
    variant: result.variant,
    puckData,
    retried: result.retried,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });
}
