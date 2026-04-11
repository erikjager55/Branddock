// =============================================================================
// POST   /api/studio/[deliverableId]/hero-image  — set or replace the hero image
// DELETE /api/studio/[deliverableId]/hero-image  — clear the hero image
//
// The hero image is persisted as a `DeliverableComponent` row with:
//   - componentType:  'image'
//   - groupType:      'single'
//   - variantGroup:   'hero-image'
//   - variantIndex:   0
//
// There is at most one hero-image component per deliverable. POST upserts;
// DELETE removes the row.
// =============================================================================

import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const HERO_VARIANT_GROUP = 'hero-image';

const setHeroImageSchema = z
  .object({
    imageUrl: z.string().url().max(2048),
    imageSource: z
      .enum(['library', 'url-import', 'stock', 'ai-generated', 'upload'])
      .optional(),
    /**
     * Optional MediaAsset id for cross-referencing the asset record.
     * Stored in `imageSource` as a tagged string to avoid a schema migration.
     */
    mediaAssetId: z.string().max(100).optional().nullable(),
    alt: z.string().max(500).optional().nullable(),
  })
  .strict();

interface RouteParams {
  params: Promise<{ deliverableId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deliverableId } = await params;

    // Verify ownership
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      select: { id: true },
    });
    if (!deliverable) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const raw = await request.json();
    const parsed = setHeroImageSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { imageUrl, imageSource, mediaAssetId, alt } = parsed.data;

    // Tag the source so we can recover the MediaAsset link without a
    // schema migration. Format: "<source>:<mediaAssetId>" or just "<source>".
    const sourceTag =
      mediaAssetId ? `${imageSource ?? 'library'}:${mediaAssetId}` : imageSource ?? 'library';

    // Find existing hero image component for this deliverable
    const existing = await prisma.deliverableComponent.findFirst({
      where: { deliverableId, variantGroup: HERO_VARIANT_GROUP },
      select: { id: true },
    });

    let component;
    if (existing) {
      component = await prisma.deliverableComponent.update({
        where: { id: existing.id },
        data: {
          imageUrl,
          imageSource: sourceTag,
          visualBrief: alt ?? null,
          status: 'GENERATED',
          generatedAt: new Date(),
        },
      });
    } else {
      // Determine the next order index
      const lastComponent = await prisma.deliverableComponent.findFirst({
        where: { deliverableId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      const nextOrder = (lastComponent?.order ?? -1) + 1;

      component = await prisma.deliverableComponent.create({
        data: {
          deliverableId,
          componentType: 'image',
          groupType: 'single',
          groupIndex: 0,
          order: nextOrder,
          variantGroup: HERO_VARIANT_GROUP,
          variantIndex: 0,
          isSelected: true,
          imageUrl,
          imageSource: sourceTag,
          visualBrief: alt ?? null,
          status: 'GENERATED',
          generatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ component });
  } catch (error) {
    console.error('[POST /api/studio/[deliverableId]/hero-image]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deliverableId } = await params;

    // Verify ownership
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      select: { id: true },
    });
    if (!deliverable) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.deliverableComponent.deleteMany({
      where: { deliverableId, variantGroup: HERO_VARIANT_GROUP },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[DELETE /api/studio/[deliverableId]/hero-image]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
