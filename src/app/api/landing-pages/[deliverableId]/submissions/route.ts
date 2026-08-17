import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildLeadFormId, listLeadFormSectionIds } from '@/lib/landing-pages/lead-form';

/**
 * Resolveert de submissie-scope van dit deliverable voor de ingelogde caller.
 *
 * Levert óf een klaargemaakte `where` (de enige toegestane blik op
 * FormSubmission voor deze caller), óf de foutrespons die de route moet
 * teruggeven. `where: null` betekent: geldige toegang, maar dit deliverable
 * heeft geen enkel formulier of pagina — dus per definitie 0 submissions.
 *
 * Matching is tweeledig (OR) omdat submissions op twee assen binnenkomen:
 *  - `formId in (…)`: de LeadForm-sectie-id's uit de HUIDIGE draft-tree
 *    (`deliverable.settings.puckData`) — vangt óók zip-/WP-export-submissions
 *    zonder herleidbare landingPage;
 *  - `landingPageId in (…)`: de pagina's van dit deliverable — vangt
 *    submissions van secties die inmiddels uit de draft verwijderd zijn.
 *
 * Auth: caller must belong to the workspace that owns the deliverable
 * (zelfde patroon als publishes/route.ts). GET en DELETE delen deze functie
 * bewust: de wis-route mag geen millimeter ruimer kijken dan de lees-route.
 */
async function resolveSubmissionScope(deliverableId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
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
    return { error: NextResponse.json({ error: 'Deliverable not found' }, { status: 404 }) };
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
    return {
      error: NextResponse.json({ error: 'No access to this workspace' }, { status: 403 }),
    };
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
    return { where: null };
  }

  return {
    where: {
      workspaceId,
      OR: [
        ...(formIds.length > 0 ? [{ formId: { in: formIds } }] : []),
        ...(pageIds.length > 0 ? [{ landingPageId: { in: pageIds } }] : []),
      ],
    },
  };
}

/**
 * GET /api/landing-pages/[deliverableId]/submissions
 *
 * P3 lp-forms-leads — form-submissions van dit deliverable voor het
 * "Leads"-blok in de publish-UI (WebPagePublishPanel): totaal + de laatste 5.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  const { deliverableId } = await params;

  const scope = await resolveSubmissionScope(deliverableId);
  if ('error' in scope) {
    return scope.error;
  }
  if (scope.where === null) {
    return NextResponse.json({ total: 0, recent: [] });
  }
  const where = scope.where;

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

/**
 * DELETE /api/landing-pages/[deliverableId]/submissions?id=<submissionId>
 *
 * AVG-wisroutine (ADR 2026-08-17): wist één submissie op verzoek — art. 17
 * recht op vergetelheid, náást de tijdgebonden retentie-cron.
 *
 * De wis draait als `deleteMany` over de scope-`where` mét het id erbij, niet
 * als `delete` op id alleen. Dat is het verschil tussen "wis mijn lead" en een
 * IDOR waarmee een lid van workspace A een lead van workspace B wist: een id
 * buiten de eigen scope raakt 0 rijen en levert 404, niet 200.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  const { deliverableId } = await params;

  // Auth vóór input-validatie: een niet-ingelogde caller krijgt 401, niet een
  // 400 die verklapt hoe de route eruitziet.
  const scope = await resolveSubmissionScope(deliverableId);
  if ('error' in scope) {
    return scope.error;
  }

  const submissionId = request.nextUrl.searchParams.get('id');
  if (!submissionId) {
    return NextResponse.json({ error: 'Missing required query param: id' }, { status: 400 });
  }

  if (scope.where === null) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  const { count } = await prisma.formSubmission.deleteMany({
    where: { ...scope.where, id: submissionId },
  });
  if (count === 0) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: count });
}
