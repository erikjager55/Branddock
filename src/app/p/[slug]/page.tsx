import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Render, type Data } from '@puckeditor/core';
import { prisma } from '@/lib/prisma';
import { resolvePublishedPage } from '@/lib/landing-pages/publish-page';
import { buildSpikePuckConfig, type SpikePuckProps } from '@/features/campaigns/components/canvas/medium/puck-config';
import { assembleCanvasContext } from '@/lib/ai/canvas-context';
import { getVariantSchemaForType, type PageVariantContent } from '@/lib/landing-pages/page-type-schemas';
import { buildPageJsonLd, flavorFromProduct } from '@/lib/landing-pages/page-json-ld';
import { resolveAuthorProfile } from '@/lib/landing-pages/author-profile';
import type { SeoChecklist } from '@/lib/ai/seo-pipeline.types';
import { seoChecklistToMetadata } from '@/lib/landing-pages/page-metadata';

type SpikeData = Data<SpikePuckProps>;

/**
 * Public render-route for a published web-page. Hit via either:
 *  - branddock.app/p/<slug>?workspace=<workspaceSlug> (rewritten by middleware
 *    from <workspaceSlug>.branddock.app/<slug>)
 *  - branddock.app/p/<slug> (single-tenant fallback when no workspace query
 *    is present; resolves the first published page with that slug — only
 *    useful for Branddock's own marketing pages).
 *
 * ISR-cached via Next.js default; publishes call `revalidatePath('/p/<slug>')`.
 */
interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ workspace?: string }>;
}

export const revalidate = 3600; // 1 hour fallback cache

const APP_APEX = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'branddock.app';

/**
 * Resolved een GEPUBLICEERDE page-type tot zijn (mogelijk afwezige) SEO-checklist.
 * Returnt `null` als de pagina niet bestaat/niet gepubliceerd is; `{ checklist: null }`
 * als de pagina wél gepubliceerd is maar geen `settings.seoChecklist` heeft (dan
 * geldt nog steeds de canonical-fallback). Gememoïseerd per request.
 */
const loadPublishedPageSeo = cache(
  async (
    workspaceSlug: string,
    slug: string,
  ): Promise<{ checklist: Partial<SeoChecklist> | null } | null> => {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      select: { id: true },
    });
    if (!workspace) return null;

    const page = await prisma.landingPage.findUnique({
      where: { workspaceId_slug: { workspaceId: workspace.id, slug } },
      select: { status: true, deliverableId: true },
    });
    if (!page || page.status !== 'PUBLISHED') return null;

    const deliverable = await prisma.deliverable.findUnique({
      where: { id: page.deliverableId },
      select: { settings: true },
    });
    // Defensief: Prisma's Json is runtime-onbekend — valideer de vorm vóór cast.
    const settings =
      deliverable?.settings && typeof deliverable.settings === 'object' && !Array.isArray(deliverable.settings)
        ? (deliverable.settings as Record<string, unknown>)
        : {};
    const raw = settings.seoChecklist;
    const checklist = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Partial<SeoChecklist>) : null;
    return { checklist };
  },
);

/**
 * Per-pagina HTML-metadata voor een gepubliceerde web-page: zet <title>,
 * meta-description, OpenGraph en canonical uit de gepersisteerde SEO-checklist,
 * met een canonical-fallback op de subdomein-URL. Onbekende/niet-gepubliceerde
 * pagina → root-layout-defaults; nooit een throw.
 */
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { workspace } = await searchParams;
  if (!workspace) return {};

  const result = await loadPublishedPageSeo(workspace, slug);
  if (!result) return {};

  const fallbackCanonical = `https://${workspace}.${APP_APEX}/${slug}`;
  return seoChecklistToMetadata(result.checklist, { fallbackCanonical });
}

export default async function PublishedPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { workspace } = await searchParams;

  if (!workspace) {
    notFound();
  }

  const resolved = await resolvePublishedPage(
    prisma as unknown as Parameters<typeof resolvePublishedPage>[0],
    workspace,
    slug,
  );
  if (!resolved) {
    notFound();
  }

  const deliverableContext = await prisma.landingPage.findUnique({
    where: { workspaceId_slug: { workspaceId: resolved.workspaceId, slug } },
    select: { deliverableId: true },
  });
  if (!deliverableContext) {
    notFound();
  }

  const ctx = await assembleCanvasContext(deliverableContext.deliverableId, resolved.workspaceId);
  const config = buildSpikePuckConfig(ctx);
  const data = resolved.puckData as SpikeData;

  // JSON-LD: Product/Service (product-page), FAQPage (faq-page), BlogPosting +
  // geneste FAQPage/DefinedTermSet (geoArticle/long-form GEO). Leest de
  // gepersisteerde structuredVariant + valideert tegen het type-schema; bij
  // afwezig/ongeldig/ander type wordt niets geïnjecteerd (shape-dispatch).
  const jsonLd = await buildPageJsonLdForDeliverable(
    deliverableContext.deliverableId,
    resolved.workspaceId,
    ctx,
  );

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <Render config={config} data={data} />
    </>
  );
}

/**
 * Bouwt de JSON-LD voor een gepubliceerd deliverable uit de gepersisteerde
 * settings.structuredVariant (faq → FAQPage, product → Product/Service, geoArticle
 * → BlogPosting). Fail-soft: elke afwijking (geen variant, ander content-type,
 * schema-mismatch) geeft null → geen script-tag. BlogPosting-dates komen uit de
 * LandingPage-metadata (publish/update-tijd); inLanguage + author (E-E-A-T) uit
 * de workspace (contentLanguage + authorProfile).
 */
async function buildPageJsonLdForDeliverable(
  deliverableId: string,
  workspaceId: string,
  ctx: Awaited<ReturnType<typeof assembleCanvasContext>>,
): Promise<Record<string, unknown> | null> {
  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    select: { contentType: true, settings: true },
  });
  if (!deliverable) return null;
  const settings =
    deliverable.settings && typeof deliverable.settings === 'object' && !Array.isArray(deliverable.settings)
      ? (deliverable.settings as Record<string, unknown>)
      : {};
  const rawVariant = settings.structuredVariant;
  if (!rawVariant || typeof rawVariant !== 'object') return null;

  const parsed = getVariantSchemaForType(deliverable.contentType).safeParse(rawVariant);
  if (!parsed.success) return null;

  // Freshness-datums voor BlogPosting uit de LandingPage-snapshot (system-sourced,
  // niet uit de AI-variant). Alleen relevant voor geoArticle; fail-soft.
  const landingPage = await prisma.landingPage.findFirst({
    where: { deliverableId },
    select: { publishedAt: true, updatedAt: true },
  });

  // E-E-A-T + taal uit de workspace (Fase 3). contentLanguage is system-sourced
  // (ISO 639-1); authorProfile (Json) wordt defensief gevalideerd → Person|null.
  // Fail-soft: dit zit op het publieke render-pad van ÁLLE gepubliceerde pagina's;
  // mocht de additieve authorProfile-kolom in een omgeving (nog) niet ge-db-pusht
  // zijn, mag de query de paginarender niet laten crashen.
  let workspace: { contentLanguage: string; authorProfile: unknown } | null = null;
  try {
    workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { contentLanguage: true, authorProfile: true },
    });
  } catch (err) {
    console.warn('[p/[slug]] workspace author/lang fetch faalde (genegeerd):', err instanceof Error ? err.message : err);
  }

  const product = ctx.products[0] ?? null;
  return buildPageJsonLd(parsed.data as PageVariantContent, {
    brandName: ctx.brand?.brandName ?? null,
    imageUrl: product?.images?.find((img) => /^https?:\/\//i.test(img.url))?.url ?? null,
    flavor: flavorFromProduct(product),
    datePublished: landingPage?.publishedAt?.toISOString() ?? null,
    dateModified: landingPage?.updatedAt?.toISOString() ?? null,
    inLanguage: workspace?.contentLanguage ?? null,
    author: resolveAuthorProfile(workspace?.authorProfile),
  });
}
