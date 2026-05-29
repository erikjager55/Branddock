import { notFound } from 'next/navigation';
import { Render, type Data } from '@puckeditor/core';
import { prisma } from '@/lib/prisma';
import { resolvePublishedPage } from '@/lib/landing-pages/publish-page';
import { buildSpikePuckConfig, type SpikePuckProps } from '@/features/campaigns/components/canvas/medium/puck-config';
import { assembleCanvasContext } from '@/lib/ai/canvas-context';

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

  return <Render config={config} data={data} />;
}
