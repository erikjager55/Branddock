import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseJsonBody } from '@/lib/api/parse-json-body';
import { rollbackToPublish } from '@/lib/landing-pages/publish-page';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

/**
 * POST /api/landing-pages/[deliverableId]/rollback
 *
 * P1 versioned publishes — rollback = pointer-swap (Netlify-model): repoint
 * `LandingPage.livePublishId` naar een eerdere `PagePublish`-snapshot en
 * revalideer de publieke render-route. Snapshots worden nooit gemuteerd.
 *
 * Body: { publishId: string }
 * Auth: caller must belong to the workspace that owns the deliverable; the
 * publish must belong to a LandingPage of exactly this deliverable (voorkomt
 * cross-page/cross-workspace repoints via een geraden publishId).
 *
 * Returns: { ok: true, liveVersion }
 */
const rollbackSchema = z.object({
  publishId: z.string().min(1).max(64),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  const { deliverableId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, rollbackSchema);
  if (!parsed.ok) return parsed.response;
  const { publishId } = parsed.data;

  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    select: { id: true, campaign: { select: { workspaceId: true } } },
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
    select: { id: true, role: true },
  });
  if (!membership) {
    return NextResponse.json({ error: 'No access to this workspace' }, { status: 403 });
  }
  // Rollback wisselt de live versie — outward-facing mutatie, viewers read-only.
  if (membership.role === 'viewer') {
    return NextResponse.json({ error: 'Viewers cannot roll back pages' }, { status: 403 });
  }

  // Scope-check: de snapshot moet bij een LandingPage van dít deliverable
  // horen — de publishId alleen is niet genoeg (append-only tabel over alle
  // workspaces heen).
  const publish = await prisma.pagePublish.findUnique({
    where: { id: publishId },
    select: {
      id: true,
      landingPage: { select: { id: true, slug: true, deliverableId: true } },
    },
  });
  if (!publish || publish.landingPage.deliverableId !== deliverableId) {
    return NextResponse.json(
      { error: 'Publish version not found for this deliverable' },
      { status: 404 },
    );
  }

  try {
    const { liveVersion } = await rollbackToPublish(
      prisma as unknown as Parameters<typeof rollbackToPublish>[0],
      { landingPageId: publish.landingPage.id, publishId },
    );

    // Live pointer is verlegd → publieke render-route on-demand verversen
    // (zelfde mechanisme als publish; fallback-TTL is 7 dagen).
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true },
    });
    // ⚠️ DOET OP DIT MOMENT NIETS. `/p/<ws>/<slug>` rendert dynamisch per
    // request — de root layout leest `cookies()` en `headers()`, dus er staat
    // niets in de cache om te verversen. Deze aanroep is bewust blijven staan:
    // hij wordt vanzelf weer het juiste mechanisme zodra statisch renderen
    // aangaat (sectie D van tasks/document-lang-followups.md), en hem nu
    // weghalen betekent hem later opnieuw bedenken.
    // Lees hem dus niet als een actieve optimalisatie.
    if (workspace?.slug) {
      revalidatePath(`/p/${workspace.slug}/${publish.landingPage.slug}`);
    }
    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));

    return NextResponse.json({ ok: true, liveVersion });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Rollback failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
