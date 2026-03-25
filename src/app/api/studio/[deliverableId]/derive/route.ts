import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { z } from 'zod';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

const deriveSchema = z.object({
  targetPlatform: z.string().min(1).max(100),
  targetFormat: z.string().min(1).max(100),
  title: z.string().min(1).max(200).optional(),
});

/** POST /api/studio/[deliverableId]/derive — Create a derivative deliverable for another platform */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { deliverableId } = await params;

    const source = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: {
        campaign: { select: { workspaceId: true, id: true, title: true } },
        components: { where: { isSelected: true } },
      },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source deliverable not found' }, { status: 404 });
    }
    if (source.campaign.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = deriveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { targetPlatform, targetFormat, title } = parsed.data;

    const derivedTitle = title ??
      `${source.title} (${targetPlatform} ${targetFormat})`;

    // Create derived deliverable
    const derived = await prisma.deliverable.create({
      data: {
        title: derivedTitle,
        contentType: `${targetPlatform}_${targetFormat}`,
        campaignId: source.campaign.id,
        derivedFromId: deliverableId,
        status: 'NOT_STARTED',
        approvalStatus: 'DRAFT',
        progress: 0,
        // Copy pipeline-related settings from source
        settings: source.settings ?? undefined,
        journeyPhase: source.journeyPhase,
      },
    });

    // Cache invalidation
    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));

    return NextResponse.json({
      newDeliverableId: derived.id,
      sourceDeliverableId: deliverableId,
      title: derived.title,
    });
  } catch (error) {
    console.error('[POST /api/studio/:id/derive]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
