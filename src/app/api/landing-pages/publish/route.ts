import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { publishLandingPage, isValidSlug } from '@/lib/landing-pages/publish-page';
import { longFormGeoVariantSchema } from '@/lib/landing-pages/page-type-schemas';
import { buildGeoOptimizationAnalysis } from '@/lib/landing-pages/geo-analysis';

/**
 * POST /api/landing-pages/publish
 *
 * Snapshots `deliverable.settings.puckData` to a `LandingPage` record
 * (per ADR 2026-05-22-landing-page-builder-architectuur — immutable snapshots).
 * Auth: caller must belong to the workspace that owns the deliverable.
 *
 * Body: { deliverableId: string, slug: string }
 *
 * Returns: { id, slug, status, publishedAt, url }
 */
interface PublishBody {
  deliverableId: string;
  slug: string;
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: PublishBody;
  try {
    body = (await request.json()) as PublishBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.deliverableId || typeof body.deliverableId !== 'string') {
    return NextResponse.json({ error: 'deliverableId required' }, { status: 400 });
  }
  if (!isValidSlug(body.slug ?? '')) {
    return NextResponse.json(
      { error: 'Slug must be lowercase a-z, 0-9, hyphens (no leading/trailing)' },
      { status: 400 },
    );
  }

  const deliverable = await prisma.deliverable.findUnique({
    where: { id: body.deliverableId },
    select: {
      id: true,
      contentType: true,
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

  const settings = (deliverable.settings ?? {}) as Record<string, unknown>;
  const puckData = settings.puckData;
  if (puckData === undefined || puckData === null) {
    return NextResponse.json(
      { error: 'No puckData on deliverable — open the builder + edit before publishing' },
      { status: 422 },
    );
  }

  try {
    const result = await publishLandingPage(
      prisma as unknown as Parameters<typeof publishLandingPage>[0],
      {
        workspaceId,
        deliverableId: deliverable.id,
        slug: body.slug,
        puckData: puckData as never,
      },
    );

    revalidatePath(`/p/${body.slug}`);

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true },
    });
    const url = workspace?.slug
      ? `https://${workspace.slug}.branddock.app/${body.slug}`
      : `https://branddock.app/p/${body.slug}`;

    // GEO Fase 3 — meet-haak: persist een deterministische GEO-analyse voor een
    // gepubliceerd long-form GEO-artikel (geoScore + signalen + schema-types +
    // canonical). Fail-soft: mag de publish nooit breken; bij republish wordt de
    // analyse overschreven (dateModified komt los uit LandingPage.updatedAt).
    try {
      const parsedVariant = longFormGeoVariantSchema.safeParse(settings.structuredVariant);
      if (parsedVariant.success) {
        const analysis = buildGeoOptimizationAnalysis({
          variant: parsedVariant.data,
          canonicalUrl: url,
          now: new Date(),
        });
        // Verse read zodat een gelijktijdige autosave (puckData/hero) niet wordt geclobberd.
        const fresh = await prisma.deliverable.findUnique({
          where: { id: deliverable.id },
          select: { settings: true },
        });
        const freshSettings =
          fresh?.settings && typeof fresh.settings === 'object' && !Array.isArray(fresh.settings)
            ? (fresh.settings as Record<string, unknown>)
            : {};
        await prisma.deliverable.update({
          where: { id: deliverable.id },
          data: {
            settings: JSON.parse(JSON.stringify({ ...freshSettings, geoOptimizationAnalysis: analysis })),
          },
        });
      }
    } catch (err) {
      console.warn('[landing-pages/publish] GEO-analyse-haak faalde (genegeerd):', err instanceof Error ? err.message : err);
    }

    return NextResponse.json({ ...result, url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Publish failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
