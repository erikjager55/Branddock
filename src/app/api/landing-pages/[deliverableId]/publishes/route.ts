import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listPagePublishes } from '@/lib/landing-pages/publish-page';

/**
 * GET /api/landing-pages/[deliverableId]/publishes
 *
 * P1 versioned publishes — versie-overzicht voor de publish-UI (Step 4).
 * Returnt per LandingPage van dit deliverable (er kan er één per locale
 * bestaan) de slug + status + live-versie + publieke URL + de volledige
 * append-only versielijst uit `PagePublish` (nieuwste eerst).
 *
 * Auth: caller must belong to the workspace that owns the deliverable
 * (zelfde patroon als publish/route.ts).
 *
 * Returns: {
 *   deliverableId, deliverableTitle, workspaceSlug,
 *   pages: [{ landingPageId, slug, locale, status, publishedAt,
 *             liveVersion, publicUrl,
 *             versions: [{ id, version, createdAt, publishedById, isLive }] }]
 * }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  const { deliverableId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    select: {
      id: true,
      title: true,
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
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: 'No access to this workspace' }, { status: 403 });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { slug: true },
  });

  const pages = await prisma.landingPage.findMany({
    where: { deliverableId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, slug: true, locale: true, status: true, publishedAt: true },
  });

  const pagesWithVersions = await Promise.all(
    pages.map(async (page) => {
      const versions = await listPagePublishes(
        prisma as unknown as Parameters<typeof listPagePublishes>[0],
        page.id,
      );
      return {
        landingPageId: page.id,
        slug: page.slug,
        locale: page.locale,
        status: page.status,
        publishedAt: page.publishedAt,
        liveVersion: versions.find((v) => v.isLive)?.version ?? null,
        publicUrl: workspace?.slug
          ? `https://${workspace.slug}.branddock.app/${page.slug}`
          : `https://branddock.app/p/${page.slug}`,
        versions,
      };
    }),
  );

  return NextResponse.json({
    deliverableId: deliverable.id,
    deliverableTitle: deliverable.title,
    workspaceSlug: workspace?.slug ?? null,
    pages: pagesWithVersions,
  });
}
