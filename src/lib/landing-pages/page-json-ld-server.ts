/**
 * Server-side JSON-LD-assemblage voor een gepubliceerd deliverable —
 * geëxtraheerd uit de publieke render-route (P2) zodat de publish-route het
 * resultaat in het bevroren artifact kan embedden en de route het op het
 * runtime-fallback-pad kan blijven gebruiken. Gedrag ongewijzigd
 * (fail-soft; shape-dispatch via het per-type schema).
 */
import { prisma } from '@/lib/prisma';
import { getVariantSchemaForType, type PageVariantContent } from './page-type-schemas';
import { buildPageJsonLd, flavorFromProduct } from './page-json-ld';
import { resolveAuthorProfile } from './author-profile';
import type { assembleCanvasContext } from '@/lib/ai/canvas-context';

type CanvasCtx = Awaited<ReturnType<typeof assembleCanvasContext>>;

export async function buildPageJsonLdForDeliverable(
  deliverableId: string,
  workspaceId: string,
  ctx: CanvasCtx,
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

  // Freshness-datums voor BlogPosting uit de LandingPage-snapshot (system-sourced).
  const landingPage = await prisma.landingPage.findFirst({
    where: { deliverableId },
    select: { publishedAt: true, updatedAt: true },
  });

  // E-E-A-T + taal uit de workspace; fail-soft — mag een render/publish nooit breken.
  let workspace: { contentLanguage: string; authorProfile: unknown } | null = null;
  try {
    workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { contentLanguage: true, authorProfile: true },
    });
  } catch (err) {
    console.warn('[page-json-ld-server] workspace author/lang fetch faalde (genegeerd):', err instanceof Error ? err.message : err);
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

// Pure serialisatie leeft in page-json-ld.ts (geen prisma-afhankelijkheid);
// hier her-geëxporteerd voor route-consumenten van deze server-module.
export { serializeJsonLdForHtml } from './html-escape';
