import { notFound } from 'next/navigation';
import { Render, type Data } from '@puckeditor/core';
import { prisma } from '@/lib/prisma';
import { resolvePublishedPage } from '@/lib/landing-pages/publish-page';
import { buildSpikePuckConfig, type SpikePuckProps } from '@/features/campaigns/components/canvas/medium/puck-config';
import { assembleCanvasContext } from '@/lib/ai/canvas-context';
import { getVariantSchemaForType, type PageVariantContent } from '@/lib/landing-pages/page-type-schemas';
import { buildPageJsonLd, flavorFromProduct } from '@/lib/landing-pages/page-json-ld';

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

  // W2/W3 — JSON-LD (Product/Service voor product-page, FAQPage voor faq-page).
  // Leest de gepersisteerde structuredVariant + valideert tegen het type-schema;
  // bij afwezig/ongeldig/ander type wordt niets geïnjecteerd (shape-dispatch).
  const jsonLd = await buildPageJsonLdForDeliverable(deliverableContext.deliverableId, ctx);

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
 * settings.structuredVariant. Fail-soft: elke afwijking (geen variant, ander
 * content-type, schema-mismatch) geeft null → geen script-tag.
 */
async function buildPageJsonLdForDeliverable(
  deliverableId: string,
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

  const product = ctx.products[0] ?? null;
  return buildPageJsonLd(parsed.data as PageVariantContent, {
    brandName: ctx.brand?.brandName ?? null,
    imageUrl: product?.images?.find((img) => /^https?:\/\//i.test(img.url))?.url ?? null,
    flavor: flavorFromProduct(product),
  });
}
