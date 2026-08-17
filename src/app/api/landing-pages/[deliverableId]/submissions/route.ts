import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildLeadFormId, listLeadFormSectionIds } from '@/lib/landing-pages/lead-form';
import { buildSubmissionScope } from '@/lib/landing-pages/submission-scope';

/**
 * Resolveert de submissie-scope van dit deliverable voor de ingelogde caller.
 *
 * Doet de auth-keten (sessie → deliverable → membership) en levert óf de
 * foutrespons die de route moet teruggeven, óf de scope plus de rol van de
 * caller. De scope-regel zelf staat in `buildSubmissionScope`; `where: null`
 * betekent daar: dit deliverable heeft geen formulier én geen pagina, dus per
 * definitie 0 submissions.
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
      // `isActive` telt mee: deze rij autoriseert een onomkeerbare PII-delete,
      // en een gedeactiveerd lid mag die net zo min als de leads lezen.
      isActive: true,
      organization: { workspaces: { some: { id: workspaceId } } },
    },
    select: { id: true, role: true },
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

  // `workspaceId` staat er expliciet bij, niet alleen `deliverableId`: de
  // tenant-veiligheid van de pagina-tak mag niet leunen op de aanname dat elke
  // schrijver `LandingPage.workspaceId` gelijk houdt aan die van de campagne.
  const pages = await prisma.landingPage.findMany({
    where: { deliverableId, workspaceId },
    select: { id: true },
  });
  const pageIds = pages.map((p) => p.id);

  // Scope-regel staat in `buildSubmissionScope` — Prisma-vrij en dus direct
  // testbaar; zie de smoke voor de cross-tenant- en duplicaat-assertie.
  return {
    ...buildSubmissionScope({ workspaceId, formIds, pageIds }),
    workspaceId,
    role: membership.role,
    userId: session.user.id,
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

/** Rollen die lead-PII mogen wissen. */
const ERASURE_ROLES = ['owner', 'admin'] as const;

const submissionIdSchema = z.string().min(1).max(64);

/**
 * DELETE /api/landing-pages/[deliverableId]/submissions?id=<submissionId>
 *
 * AVG-wisroutine (ADR 2026-08-17): wist één submissie op verzoek — art. 17
 * recht op vergetelheid, náást de tijdgebonden retentie-cron.
 *
 * Drie lagen die elk iets anders tegenhouden:
 *
 *  1. **Rol** — alleen owner/admin. Strenger dan de rollback-route hiernaast
 *     (die alleen `viewer` weert), omdat een pointer-swap terug te draaien is
 *     en dit niet: er is bewust geen soft-delete of archief. `require-role.ts`
 *     stelt owner/admin als norm voor destructieve acties.
 *  2. **Scope** — `deleteWhere`, niet de ruimere lees-`where`; zie de toelichting
 *     bij `resolveSubmissionScope`.
 *  3. **Vorm** — `deleteMany` over die scope mét het id erbij, niet `delete` op
 *     id alleen. Dat is het verschil tussen "wis mijn lead" en een IDOR waarmee
 *     een lid van workspace A een lead van workspace B wist: een id buiten de
 *     scope raakt 0 rijen en levert 404, niet 200.
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
  if (!ERASURE_ROLES.includes(scope.role as (typeof ERASURE_ROLES)[number])) {
    return NextResponse.json(
      { error: 'Only owners and admins can erase form submissions' },
      { status: 403 },
    );
  }

  const parsed = submissionIdSchema.safeParse(request.nextUrl.searchParams.get('id'));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Missing or invalid required query param: id' },
      { status: 400 },
    );
  }

  if (scope.deleteWhere === null) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  const { count } = await prisma.formSubmission.deleteMany({
    where: { ...scope.deleteWhere, id: parsed.data },
  });
  if (count === 0) {
    // De wis-scope is strikter dan de lees-scope. Wie de lead in het Leads-blok
    // ziet staan en "bestaat niet" terugkrijgt, heeft niets om op te handelen —
    // dus hier uitzoeken waaróm hij buiten de wis-scope viel.
    const readable =
      scope.where === null
        ? null
        : await prisma.formSubmission.findFirst({
            where: { ...scope.where, id: parsed.data },
            select: { id: true, landingPageId: true },
          });
    if (!readable) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // `landingPageId` is bewust FK-loos (leads overleven een pagina-delete), dus
    // een verwijderd deliverable laat rijen achter met een dood id. Die zijn via
    // de `formId`-tak wél leesbaar maar door geen enkel deliverable te wissen:
    // PII die we tonen en niemand kan verwijderen. Dat is precies wat art. 17
    // verbiedt, dus een verweesde rij mag hier wél weg.
    const orphaned =
      readable.landingPageId !== null &&
      (await prisma.landingPage.count({ where: { id: readable.landingPageId } })) === 0;
    if (orphaned) {
      const erased = await prisma.formSubmission.deleteMany({
        where: { workspaceId: scope.workspaceId, id: parsed.data },
      });
      console.info(
        `[DELETE submissions] user ${scope.userId} erased ORPHANED submission ${parsed.data} (dangling landingPageId ${readable.landingPageId})`,
      );
      return NextResponse.json({ deleted: erased.count, orphaned: true });
    }

    return NextResponse.json(
      {
        error:
          'Submission belongs to another deliverable in this workspace — erase it from the deliverable that owns its page',
      },
      { status: 409 },
    );
  }

  // Erasure-spoor: wie wiste wat, wanneer. Er is geen AuditLog-model, dus dit
  // is de enige plek waar dat terug te vinden is.
  console.info(
    `[DELETE submissions] user ${scope.userId} erased submission ${parsed.data} from deliverable ${deliverableId}`,
  );
  return NextResponse.json({ deleted: count });
}
