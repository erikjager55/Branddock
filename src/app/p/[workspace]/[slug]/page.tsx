import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageRender } from '@/lib/landing-pages/page-render';
import type { PageData as Data } from '@/lib/landing-pages/page-data';
import { prisma } from '@/lib/prisma';
import { resolvePublishedPage } from '@/lib/landing-pages/publish-page';
import { buildSpikePuckConfig, type SpikePuckProps } from '@/features/campaigns/components/canvas/medium/puck-config';
import { assembleCanvasContext } from '@/lib/ai/canvas-context';
import { buildPageJsonLdForDeliverable, serializeJsonLdForHtml } from '@/lib/landing-pages/page-json-ld-server';
import { buildPageRuntimeScriptBody } from '@/lib/landing-pages/static-compile';
import type { SeoChecklist } from '@/lib/ai/seo-pipeline.types';
import { seoChecklistToMetadata } from '@/lib/landing-pages/page-metadata';
import { resolvePageTitleFromPuckData } from '@/lib/landing-pages/page-title';

type SpikeData = Data<SpikePuckProps>;

/**
 * Public render-route for a published web-page. Hit via the middleware
 * rewrite `<workspaceSlug>.branddock.app/<slug>` → `/p/<workspaceSlug>/<slug>`.
 *
 * ISR-fix (P0, verbeterplan v3): workspace als PAD-parameter i.p.v.
 * `?workspace=` — `searchParams` is een Dynamic API die de route naar
 * dynamische rendering schakelde, waardoor `revalidate` geen effect had en
 * élke publieke view de volledige DB+render-keten draaide. Met alleen
 * `params` is de route statisch cachebaar; publishes doen on-demand
 * `revalidatePath('/p/<ws>/<slug>')` en de fallback-TTL is bewust lang
 * (7 dagen — webhook-miss-verzekering, geen refresh-mechanisme).
 */
interface Props {
  params: Promise<{ workspace: string; slug: string }>;
}

export const revalidate = 604800; // 7 dagen fallback; on-demand revalidate is primair

const APP_APEX = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'branddock.app';

/**
 * Resolved een GEPUBLICEERDE page-type tot zijn (mogelijk afwezige) SEO-checklist
 * plus een uit de pagina-boom afgeleide titel (fallback voor de <title>).
 * Returnt `null` als de pagina niet bestaat/niet gepubliceerd is; `{ checklist: null }`
 * als de pagina wél gepubliceerd is maar geen `settings.seoChecklist` heeft (dan
 * geldt nog steeds de canonical-fallback). Gememoïseerd per request.
 */
const loadPublishedPageSeo = cache(
  async (
    workspaceSlug: string,
    slug: string,
  ): Promise<{ checklist: Partial<SeoChecklist> | null; derivedTitle: string | undefined } | null> => {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      select: { id: true },
    });
    if (!workspace) return null;

    const page = await prisma.landingPage.findFirst({
      where: { workspaceId: workspace.id, slug },
      select: { status: true, deliverableId: true, puckData: true },
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
    return { checklist, derivedTitle: resolvePageTitleFromPuckData(page.puckData) };
  },
);

/**
 * Per-pagina HTML-metadata voor een gepubliceerde web-page: zet <title>,
 * meta-description, OpenGraph en canonical uit de gepersisteerde SEO-checklist,
 * met een canonical-fallback op de subdomein-URL. Onbekende/niet-gepubliceerde
 * pagina → root-layout-defaults; nooit een throw.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace, slug } = await params;

  const result = await loadPublishedPageSeo(workspace, slug);
  if (!result) return {};

  const fallbackCanonical = `https://${workspace}.${APP_APEX}/${slug}`;
  return seoChecklistToMetadata(result.checklist, {
    fallbackCanonical,
    // `settings.seoChecklist` bestaat alleen voor pagina's uit de SEO-pipeline;
    // die uit de gewone webpage-builder krijgen zo tóch hun eigen hero-kop als
    // titel in plaats van de generieke layout-default.
    fallbackTitle: result.derivedTitle,
  });
}

export default async function PublishedPage({ params }: Props) {
  const { workspace, slug } = await params;

  const resolved = await resolvePublishedPage(
    prisma as unknown as Parameters<typeof resolvePublishedPage>[0],
    workspace,
    slug,
  );
  if (!resolved) {
    notFound();
  }

  // P2 (ADR 2026-08-12): bevroren artifact van de live versie — geen
  // context-assembly, geen config-build, geen render; JSON-LD + styles +
  // fonts zitten ín het artifact. Rollback serveert automatisch de bevroren
  // staat van díe versie. Zonder artifact: runtime-fallback hieronder.
  if (resolved.compiledHtml) {
    return <div dangerouslySetInnerHTML={{ __html: resolved.compiledHtml }} />;
  }

  const deliverableContext = await prisma.landingPage.findFirst({
    where: { workspaceId: resolved.workspaceId, slug },
    select: { deliverableId: true },
  });
  if (!deliverableContext) {
    notFound();
  }

  const ctx = await assembleCanvasContext(deliverableContext.deliverableId, resolved.workspaceId);
  // P3: workspaceId in de config zodat een LeadForm ook op het
  // runtime-fallback-pad (pre-P2-publishes) een werkend formId-action heeft.
  const config = buildSpikePuckConfig(ctx, { workspaceId: resolved.workspaceId });
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

  // Zelfde meting + form-enhancement als het artifact-pad: zonder dit script
  // vuurt de view-beacon niet op pre-P2-publishes (inconsistente stats).
  const hasLeadForm = Array.isArray(data?.content)
    && data.content.some((item) => item?.type === 'LeadForm');
  const runtimeScript = buildPageRuntimeScriptBody({ withForms: hasLeadForm });

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          // Escape HTML-significante tekens: JSON.stringify escaped `<`/`>`/`&` niet,
          // dus AI-/user-content met `</script>` kan anders uit het <script>-element
          // breken (stored XSS op de publieke pagina). Zie security-audit 2026-06-26 H2.
          dangerouslySetInnerHTML={{ __html: serializeJsonLdForHtml(jsonLd) }}
        />
      ) : null}
      <PageRender config={config} data={data} />
      {/* Statisch samengesteld first-party script (geen user-input) — zie static-compile. */}
      <script dangerouslySetInnerHTML={{ __html: runtimeScript }} />
    </>
  );
}
