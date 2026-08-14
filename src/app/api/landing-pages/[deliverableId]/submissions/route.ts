import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildLeadFormId, listLeadFormSectionIds } from '@/lib/landing-pages/lead-form';

/**
 * GET /api/landing-pages/[deliverableId]/submissions
 *
 * P3 lp-forms-leads — form-submissions van dit deliverable voor het
 * "Leads"-blok in de publish-UI (WebPagePublishPanel): totaal + de laatste 5.
 *
 * Matching is tweeledig (OR) omdat submissions op twee assen binnenkomen:
 *  - `formId in (…)`: de LeadForm-sectie-id's uit de HUIDIGE draft-tree
 *    (`deliverable.settings.puckData`) — vangt óók zip-/WP-export-submissions
 *    zonder herleidbare landingPage;
 *  - `landingPageId in (…)`: de pagina's van dit deliverable — vangt
 *    submissions van secties die inmiddels uit de draft verwijderd zijn.
 *
 * Auth: caller must belong to the workspace that owns the deliverable
 * (zelfde patroon als publishes/route.ts).
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
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: 'No access to this workspace' }, { status: 403 });
  }

  const settings =
    deliverable.settings && typeof deliverable.settings === 'object' && !Array.isArray(deliverable.settings)
      ? (deliverable.settings as Record<string, unknown>)
      : {};
  const formIds = listLeadFormSectionIds(settings.puckData).map((sectionId) =>
    buildLeadFormId(workspaceId, sectionId),
  );

  const pages = await prisma.landingPage.findMany({
    where: { deliverableId },
    select: { id: true },
  });
  const pageIds = pages.map((p) => p.id);

  if (formIds.length === 0 && pageIds.length === 0) {
    return NextResponse.json({ total: 0, recent: [] });
  }

  const where = {
    workspaceId,
    OR: [
      ...(formIds.length > 0 ? [{ formId: { in: formIds } }] : []),
      ...(pageIds.length > 0 ? [{ landingPageId: { in: pageIds } }] : []),
    ],
  };

  const [total, recent] = await Promise.all([
    prisma.formSubmission.count({ where }),
    prisma.formSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, formId: true, data: true, sourceUrl: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({ total, recent });
}
