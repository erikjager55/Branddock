import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { updateDeliverableSettings } from '@/lib/content/update-deliverable-settings';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { publishLandingPage, isValidSlug } from '@/lib/landing-pages/publish-page';
import { resolveLocaleForBrand } from '@/lib/brand-fidelity/heuristics/locale-resolver';
import { longFormGeoVariantSchema } from '@/lib/landing-pages/page-type-schemas';
import { buildGeoOptimizationAnalysis } from '@/lib/landing-pages/geo-analysis';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { runPublishGate } from '@/lib/landing-pages/publish-gate';
import { compilePageArtifact } from '@/lib/landing-pages/static-compile';
import { buildPageJsonLdForDeliverable } from '@/lib/landing-pages/page-json-ld-server';
import { assembleCanvasContext } from '@/lib/ai/canvas-context';
import { buildSpikePuckConfig } from '@/features/campaigns/components/canvas/medium/puck-config';
import type { RenderablePageData } from '@/lib/landing-pages/page-render';

/**
 * POST /api/landing-pages/publish
 *
 * Snapshots `deliverable.settings.puckData` to a `LandingPage` record
 * (per ADR 2026-05-22-landing-page-builder-architectuur — immutable snapshots).
 * Auth: caller must belong to the workspace that owns the deliverable.
 *
 * Body: { deliverableId: string, slug: string }
 *
 * Returns: { id, slug, status, publishedAt, url }
 */
interface PublishBody {
  deliverableId: string;
  slug: string;
  /** P6 publish-gate: alleen checks draaien, niets persisten. */
  dryRun?: boolean;
  /** P6: user heeft de warnings gezien en publiceert bewust door. */
  acknowledgeWarnings?: boolean;
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: PublishBody;
  try {
    body = (await request.json()) as PublishBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.deliverableId || typeof body.deliverableId !== 'string') {
    return NextResponse.json({ error: 'deliverableId required' }, { status: 400 });
  }
  if (!isValidSlug(body.slug ?? '')) {
    return NextResponse.json(
      { error: 'Slug must be lowercase a-z, 0-9, hyphens (no leading/trailing)' },
      { status: 400 },
    );
  }

  const deliverable = await prisma.deliverable.findUnique({
    where: { id: body.deliverableId },
    select: {
      id: true,
      contentType: true,
      settings: true,
      campaign: { select: { workspaceId: true } },
    },
  });
  if (!deliverable) {
    return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
  }

  const workspaceId = deliverable.campaign.workspaceId;
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organization: { workspaces: { some: { id: workspaceId } } },
    },
    select: { id: true, role: true },
  });
  if (!membership) {
    return NextResponse.json({ error: 'No access to this workspace' }, { status: 403 });
  }
  // Publiceren is een outward-facing mutatie: viewers zijn read-only
  // (zelfde member+-grens als de Claw-confirm-flow).
  if (membership.role === 'viewer') {
    return NextResponse.json({ error: 'Viewers cannot publish pages' }, { status: 403 });
  }

  const settings = (deliverable.settings ?? {}) as Record<string, unknown>;
  const puckData = settings.puckData;
  if (puckData === undefined || puckData === null) {
    return NextResponse.json(
      { error: 'No puckData on deliverable — open the builder + edit before publishing' },
      { status: 422 },
    );
  }

  // P6 publish-gate (verbeterplan v3): deterministische merk-/integriteits-
  // checks vóór élke publish. Blockers weigeren altijd (anti-fabricatie:
  // template-placeholder-copy mag nooit live); warnings vereisen expliciete
  // bevestiging via de twee-fasen-flow (dryRun → bevestigen → publish).
  // Republish-context: een pagina die al eens live ging mag niet hard
  // stranden op een verplichte-sectie-check die toen nog niet bestond.
  const existingPublish = await prisma.landingPage.findFirst({
    where: { deliverableId: deliverable.id, publishedAt: { not: null } },
    select: { id: true },
  });
  const gate = runPublishGate({
    puckData,
    contentType: deliverable.contentType,
    hasBeenPublished: existingPublish !== null,
  });
  if (body.dryRun === true) {
    return NextResponse.json({ gate });
  }
  if (!gate.ok) {
    return NextResponse.json(
      { error: 'Publish geblokkeerd door de publish-gate', gate },
      { status: 422 },
    );
  }
  if (gate.warnings > 0 && body.acknowledgeWarnings !== true) {
    return NextResponse.json(
      { error: 'Publish-gate heeft waarschuwingen — bevestig om door te publiceren', gate },
      { status: 409 },
    );
  }

  try {
    // Content-locale foundation: pages zijn locale-adresseerbaar; default = de
    // huidige single-locale-resolutie voor deze workspace (gedrag ongewijzigd).
    const locale = await resolveLocaleForBrand(workspaceId);
    const result = await publishLandingPage(
      prisma as unknown as Parameters<typeof publishLandingPage>[0],
      {
        workspaceId,
        deliverableId: deliverable.id,
        slug: body.slug,
        locale,
        puckData: puckData as never,
        // P1 versioned publishes — audit-veld op de PagePublish-snapshot.
        publishedById: session.user.id,
      },
    );

    // P2 compile-to-static (ADR 2026-08-12): bevries HTML + tokens van deze
    // versie in het artifact. Fail-soft — een compile-fout mag de publish
    // nooit breken; zonder artifact valt de route terug op runtime-render.
    try {
      const ctx = await assembleCanvasContext(deliverable.id, workspaceId);
      // P3: workspaceId in de config zodat LeadForm-secties hun formId
      // (`<workspaceId>:<sectionId>`) in het bevroren artifact bakken.
      const config = buildSpikePuckConfig(ctx, { workspaceId });
      const jsonLd = await buildPageJsonLdForDeliverable(deliverable.id, workspaceId, ctx);
      const artifact = await compilePageArtifact({
        puckData: puckData as unknown as RenderablePageData,
        config,
        brandTokens: ctx.brandTokens,
        jsonLd,
      });
      await prisma.pagePublish.update({
        where: { id: result.publishId },
        data: { compiledHtml: artifact.html },
      });
    } catch (err) {
      console.warn(
        '[landing-pages/publish] compile-to-static faalde (runtime-fallback blijft):',
        err instanceof Error ? err.message : err,
      );
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true },
    });
    // ⚠️ DOET OP DIT MOMENT NIETS. Hier stond dat on-demand revalidation "het
    // primaire verversmechanisme van de statisch gecachte render-route" is.
    // Dat klopt niet meer: `/p/<ws>/<slug>` rendert dynamisch per request —
    // de root layout leest `cookies()` en `headers()` — dus er staat niets in
    // de cache om te verversen.
    //
    // Bewust blijven staan: dit wordt vanzelf weer het juiste mechanisme zodra
    // statisch renderen aangaat (sectie D van tasks/document-lang-followups.md),
    // en hem nu weghalen betekent hem later opnieuw bedenken. De plaatsing ná
    // de artifact-write hoort daar dan ook bij: een verse cache-vulling moet
    // het artifact zien, niet de staat ervoor.
    if (workspace?.slug) {
      revalidatePath(`/p/${workspace.slug}/${body.slug}`);
    }
    const url = workspace?.slug
      ? `https://${workspace.slug}.branddock.app/${body.slug}`
      : `https://branddock.app/p/${body.slug}`;

    // Sync de eigenaar-Deliverable zodat een web-page/GEO-publish ook in het
    // "online content-items"-overzicht verschijnt (dat filtert op
    // approvalStatus === 'PUBLISHED'). Deze publish-keten maakte voorheen
    // alleen de LandingPage + /p/[slug]-snapshot en liet de deliverable op
    // DRAFT/APPROVED staan — de pagina ging live maar dook nooit op in de lijst.
    // Geldt voor alle PUCK_WEBPAGE_TYPES + long-form-GEO die via deze route gaan.
    // Fail-soft: de pagina is al gepubliceerd; deze boekhouding mag nooit 500'en.
    try {
      await prisma.deliverable.update({
        where: { id: deliverable.id },
        data: {
          approvalStatus: 'PUBLISHED',
          publishedAt: new Date(),
          status: 'COMPLETED',
          publishedVia: 'webpage',
          publishedUrl: url,
        },
      });
      invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
      invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));
    } catch (err) {
      console.warn(
        '[landing-pages/publish] Deliverable status-sync faalde (genegeerd):',
        err instanceof Error ? err.message : err,
      );
    }

    // GEO Fase 3 — meet-haak: persist een deterministische GEO-analyse voor een
    // gepubliceerd long-form GEO-artikel (geoScore + signalen + schema-types +
    // canonical). Fail-soft: mag de publish nooit breken; bij republish wordt de
    // analyse overschreven (dateModified komt los uit LandingPage.updatedAt).
    try {
      const parsedVariant = longFormGeoVariantSchema.safeParse(settings.structuredVariant);
      if (parsedVariant.success) {
        const analysis = buildGeoOptimizationAnalysis({
          variant: parsedVariant.data,
          canonicalUrl: url,
          now: new Date(),
        });
        // De meet-haak scoort `settings.structuredVariant` (de canonieke
        // contentbron) en herberekent bij elke (re)publish. Na een latere
        // Puck/Claw-edit van `puckData` kan de score nog de pre-edit-content
        // beschrijven; volledige puckData-flatten-scoring is bewust uitgesteld
        // (geo-seo-followup-later). De read-modify-write loopt via de gedeelde
        // helper: verse read onder `SELECT … FOR UPDATE`, zodat een
        // gelijktijdige autosave (puckData/hero) de geoOptimizationAnalysis niet
        // kan clobberen. Hier stond eerder een kale interactieve transactie met
        // de claim dat de race daarmee geëlimineerd was — dat klopte niet: onder
        // READ COMMITTED neemt een SELECT geen lock, dus beide schrijvers lazen
        // de oude blob en de laatste won alsnog. (De #337 status-sync hierboven
        // raakt aparte kolommen, geen overlap.)
        await updateDeliverableSettings(deliverable.id, (current) => ({
          ...current,
          geoOptimizationAnalysis: analysis,
        }));
      }
    } catch (err) {
      console.warn('[landing-pages/publish] GEO-analyse-haak faalde (genegeerd):', err instanceof Error ? err.message : err);
    }

    return NextResponse.json({ ...result, url });
  } catch (err) {
    // Gelijktijdige publishes racen op @@unique([landingPageId, version]) —
    // de verliezer krijgt P2002 (data blijft consistent). Dat is een
    // retryable conflict, geen serverfout.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json(
        { error: 'Er liep al een publish voor deze pagina — probeer het opnieuw' },
        { status: 409 },
      );
    }
    const message = err instanceof Error ? err.message : 'Publish failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
