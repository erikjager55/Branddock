import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assembleCanvasContext } from "@/lib/ai/canvas-context";
import { variantToPuckDataFromStructured } from "@/features/campaigns/components/canvas/medium/variant-to-puck-data";
import type { PageVariantContent } from "@/lib/landing-pages/page-type-schemas";
import { threeWayMergePuckData, type DiffMergeData } from "@/lib/landing-pages/diff-merge";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

/**
 * POST /api/landing-pages/[deliverableId]/regenerate-puck-data
 *
 * Verbeterplan #3 + B4 (`lp-variant-merge`): regenereert de Puck-tree uit de
 * gepersisteerde structuredVariant + huidige BrandTokens v4. Gebruikt voor:
 *   - Re-applicatie van geüpdate BrandStyleguide profiles (na re-scrape)
 *   - Recovery van puckData wanneer mapper-changes zijn doorgevoerd
 *   - B4: edit-preserving structure-refresh + variant-wissel (merge-modus)
 *
 * Twee modi (body `{ merge?: boolean }`, leeg body toegestaan):
 *
 * 1. **Zonder `merge` (backward-compat, DESTRUCTIEF)** — gedrag van vóór B4:
 *    mapt structuredVariant → puckData en persist die blind (handmatige
 *    Puck-edits gaan verloren). B4-aanvulling: schrijft nu óók
 *    `settings.puckDataBaseline` (= dezelfde verse tree) zodat een re-seed de
 *    baseline-invariant herstelt ("baseline = laatst geseedde tree") en een
 *    vólgende refresh wél edit-preserving kan draaien.
 *
 * 2. **Met `merge: true` (B4, NIET-persisterend preview-contract)** — draait
 *    server-side `threeWayMergePuckData({ base, current, incoming })` met
 *    base = `settings.puckDataBaseline`, current = `settings.puckData`,
 *    incoming = de verse mapping. Response:
 *    `{ merge: true, merged, conflicts, incoming, baselineUsed,
 *       editedSectionCount, refreshedSectionCount }`
 *    Er wordt hier bewust NIETS gepersisteerd (simpele flow uit de task):
 *    de client toont de confirm-modal, lost conflicten op (default
 *    keep-mine; take-new = swap op `conflicts[].mergedIndex`) en PATCH't het
 *    resultaat via het bestaande autosave-pad `PATCH /api/studio/[id]` met
 *    `settings: { puckData: <resolved>, puckDataBaseline: <incoming> }`
 *    (shallow-merge server-side). Zo blijft er één schrijfpad met de
 *    bestaande hero-preserve-chokepoint + cache-invalidatie.
 *
 *    `baselineUsed: false` betekent: geen `puckDataBaseline` aanwezig
 *    (pre-B4 deliverable) — de merge degradeert dan naar base = current,
 *    waardoor edits niet detecteerbaar zijn en de preview feitelijk een
 *    volledige refresh is. De client hoort dat als waarschuwing te tonen.
 *
 * Behoudt structuredVariant in beide modi — alleen de Puck-tree beweegt.
 */

const bodySchema = z.object({
  merge: z.boolean().optional(),
});

/** Bekende shape-discriminators van PageVariantContent (shape-dispatch in de
 *  mapper). Lichte structurele guard i.p.v. vol Zod-schema: het per-type
 *  schema zou legacy LP-shaped variants op faq/microsite-deliverables
 *  onterecht afkeuren (shape-dispatch is daar bewust de bron van waarheid). */
function looksLikePageVariant(value: unknown): value is PageVariantContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    "heroManifest" in v || "popularQuestions" in v || "solution" in v ||
    "geoArticle" in v || "hero" in v
  );
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

  // Body is optioneel (bestaande callers sturen geen body) — leeg/afwezig
  // body → destructieve modus, exact het pre-B4 contract.
  let merge = false;
  try {
    const raw: unknown = await request.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.issues },
        { status: 400 },
      );
    }
    merge = parsed.data.merge === true;
  } catch {
    // Geen/ongeldig JSON-body → destructieve modus (backward-compat).
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
  // W1: shape-based dispatch in variantToPuckDataFromStructured routet zowel
  // LP- als faq/product/microsite-shaped variants naar de juiste builder.
  // Defense-in-depth (gotcha 2026-03-20): de variant is AI-output — check de
  // shape-discriminators vóór we ermee mappen.
  const structuredVariant = settings.structuredVariant;
  if (!looksLikePageVariant(structuredVariant)) {
    return NextResponse.json(
      { error: "Geen (valide) structuredVariant aanwezig om uit te regenereren" },
      { status: 400 },
    );
  }

  // Verzamel context-stack — bevat huidige BrandTokens (incl. v4 sub-shapes)
  const ctx = await assembleCanvasContext(deliverable.id, workspaceId);
  const newPuckData = variantToPuckDataFromStructured(structuredVariant, ctx);

  if (merge) {
    // B4 merge-preview: niets persisteren; client bevestigt + PATCH't zelf.
    const currentPuckData = (settings.puckData ?? null) as DiffMergeData | null;
    const baseline = (settings.puckDataBaseline ?? null) as DiffMergeData | null;
    const baselineUsed = Boolean(baseline);
    const result = threeWayMergePuckData({
      // Zonder baseline (pre-B4 deliverable) is er geen edit-detectie
      // mogelijk: base := current ⇒ alles "onbewerkt" ⇒ volledige refresh.
      base: baselineUsed ? baseline : currentPuckData,
      current: currentPuckData,
      incoming: newPuckData as unknown as DiffMergeData,
    });
    return NextResponse.json({
      merge: true,
      merged: result.merged,
      conflicts: result.conflicts,
      incoming: newPuckData,
      baselineUsed,
      // Zonder baseline kan de merge edits niet zien (base := current). De
      // client gebruikt hadPuckData om dan alsnog expliciete bevestiging te
      // vragen wanneer er bestaande puckData is die overschreven gaat worden
      // — alleen een verse pagina (geen puckData) mag zonder modal door.
      hadPuckData: Boolean(currentPuckData),
      editedSectionCount: result.editedSectionCount,
      refreshedSectionCount: result.refreshedSectionCount,
    });
  }

  await prisma.deliverable.update({
    where: { id: deliverableId },
    data: {
      settings: {
        ...settings,
        puckData: newPuckData,
        // B4: destructieve re-seed herstelt de baseline-invariant zodat een
        // volgende merge-refresh edits kan onderscheiden van de seed.
        puckDataBaseline: newPuckData,
        puckRegeneratedAt: new Date().toISOString(),
      },
    },
  });

  invalidateCache(cacheKeys.prefixes.studio(workspaceId));
  invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));

  return NextResponse.json({ ok: true, puckData: newPuckData });
}
