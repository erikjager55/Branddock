import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/landing-pages/[deliverableId]/publish-preview?publishId=...
 *
 * P1 versioned publishes — levert de immutable puckData-snapshot van één
 * `PagePublish`-versie voor in-app preview-rendering (versielijst in de
 * publish-UI). Bewust in-app only: publieke signed-token-previews per versie
 * zijn een vervolg (zie verbeterplan §Fase A P1-scope-noot in de task-file).
 *
 * Auth: caller must belong to the workspace that owns the deliverable; the
 * publish must belong to a LandingPage of exactly this deliverable.
 *
 * Returns: { publishId, version, createdAt, puckData }
 */
const publishIdSchema = z.string().min(1).max(64);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  const { deliverableId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsedId = publishIdSchema.safeParse(
    request.nextUrl.searchParams.get('publishId'),
  );
  if (!parsedId.success) {
    return NextResponse.json({ error: 'publishId query param required' }, { status: 400 });
  }
  const publishId = parsedId.data;

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
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: 'No access to this workspace' }, { status: 403 });
  }

  const publish = await prisma.pagePublish.findUnique({
    where: { id: publishId },
    select: {
      id: true,
      version: true,
      createdAt: true,
      puckData: true,
      landingPage: { select: { deliverableId: true } },
    },
  });
  if (!publish || publish.landingPage.deliverableId !== deliverableId) {
    return NextResponse.json(
      { error: 'Publish version not found for this deliverable' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    publishId: publish.id,
    version: publish.version,
    createdAt: publish.createdAt,
    puckData: publish.puckData,
  });
}
