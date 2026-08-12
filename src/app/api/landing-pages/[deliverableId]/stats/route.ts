import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/landing-pages/[deliverableId]/stats
 *
 * P4 lp-page-analytics — first-party meting per gepubliceerde pagina van dit
 * deliverable: views + leads (PageEvent 'view'/'form_submit') over 7 én 30
 * dagen, in één response (het panel toont beide zonder extra roundtrip).
 * Conversie% berekent de client (leads/views) — hier alleen ruwe counts.
 *
 * Auth: caller must belong to the workspace that owns the deliverable
 * (zelfde patroon als publishes/route.ts). Twee groupBy-queries totaal,
 * ongeacht het aantal pagina's.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

interface PageStatsDto {
  landingPageId: string;
  slug: string;
  views7: number;
  leads7: number;
  views30: number;
  leads30: number;
}

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

  const pages = await prisma.landingPage.findMany({
    where: { deliverableId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, slug: true },
  });
  if (pages.length === 0) {
    return NextResponse.json({ pages: [] });
  }

  const pageIds = pages.map((p) => p.id);
  const since7 = new Date(Date.now() - 7 * DAY_MS);
  const since30 = new Date(Date.now() - 30 * DAY_MS);

  const [counts30, counts7] = await Promise.all([
    prisma.pageEvent.groupBy({
      by: ['landingPageId', 'kind'],
      where: { landingPageId: { in: pageIds }, createdAt: { gte: since30 } },
      _count: { _all: true },
    }),
    prisma.pageEvent.groupBy({
      by: ['landingPageId', 'kind'],
      where: { landingPageId: { in: pageIds }, createdAt: { gte: since7 } },
      _count: { _all: true },
    }),
  ]);

  const lookup = (
    rows: Array<{ landingPageId: string; kind: string; _count: { _all: number } }>,
    pageId: string,
    kind: string,
  ): number => rows.find((r) => r.landingPageId === pageId && r.kind === kind)?._count._all ?? 0;

  const result: PageStatsDto[] = pages.map((page) => ({
    landingPageId: page.id,
    slug: page.slug,
    views7: lookup(counts7, page.id, 'view'),
    leads7: lookup(counts7, page.id, 'form_submit'),
    views30: lookup(counts30, page.id, 'view'),
    leads30: lookup(counts30, page.id, 'form_submit'),
  }));

  return NextResponse.json({ pages: result });
}
