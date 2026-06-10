// =============================================================================
// POST /api/studio/[deliverableId]/select-library-visual
//
// Persist 1-3 MediaAsset IDs as the deliverable's image variants. Wired
// to Visual Brief source === 'library' — instead of generating new
// images, the user picks existing assets from the workspace media
// library. Each picked asset becomes a DeliverableComponent row with
// variantGroup='visual' and imageSource='library:{assetId}' so the
// MediaAsset linkage survives via the existing tag-encoded source field.
//
// Replaces existing visual-group components on every call so the user
// gets a clean re-pick experience (same as the generate flow).
// =============================================================================

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-server';
import { resolveDeliverableWorkspaceId } from '@/lib/deliverable/deliverable-access';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { z } from 'zod';

const VISUAL_GROUP = 'visual';

const requestSchema = z
  .object({
    assetIds: z.array(z.string().min(1)).min(1).max(3),
  })
  .strict();

interface RouteParams {
  params: Promise<{ deliverableId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    // Resource-based: workspace van het deliverable i.p.v. cookie-gelijkheid
    // (zombie-tab fix — docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md).
    const workspaceId = await resolveDeliverableWorkspaceId((await params).deliverableId);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deliverableId } = await params;

    // Verify deliverable ownership
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      select: { id: true },
    });
    if (!deliverable) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let body: z.infer<typeof requestSchema>;
    try {
      const raw = await request.json();
      body = requestSchema.parse(raw);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid request body';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Fetch the assets — workspace ownership check + grab the URLs/alt
    const assets = await prisma.mediaAsset.findMany({
      where: {
        id: { in: body.assetIds },
        workspaceId,
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
        fileUrl: true,
        aiDescription: true,
      },
    });

    if (assets.length === 0) {
      return NextResponse.json(
        { error: 'No matching media assets found in this workspace' },
        { status: 404 },
      );
    }

    // Preserve user's pick order — the assetIds array is the source of
    // truth, prisma.findMany doesn't guarantee result order.
    const byId = new Map(assets.map((a) => [a.id, a]));
    const ordered = body.assetIds
      .map((id) => byId.get(id))
      .filter((a): a is NonNullable<typeof a> => a !== undefined);

    if (ordered.length === 0) {
      return NextResponse.json(
        { error: 'None of the requested assets were found' },
        { status: 404 },
      );
    }

    // Replace existing visual-group components in a transaction.
    const components = await prisma.$transaction(async (tx) => {
      await tx.deliverableComponent.deleteMany({
        where: { deliverableId, variantGroup: VISUAL_GROUP },
      });
      const baseOrder = await tx.deliverableComponent.count({ where: { deliverableId } });
      const created: Array<{ id: string; url: string; prompt: string }> = [];
      for (let i = 0; i < ordered.length; i++) {
        const asset = ordered[i];
        // Encode the MediaAsset id into the imageSource tag so we can
        // recover the link without a separate column — same pattern
        // used by hero-image route.
        const sourceTag = `library:${asset.id}`;
        const row = await tx.deliverableComponent.create({
          data: {
            deliverableId,
            componentType: 'image',
            groupType: 'variant',
            order: baseOrder + i,
            variantGroup: VISUAL_GROUP,
            variantIndex: i,
            isSelected: i === 0,
            imageUrl: asset.fileUrl,
            imageSource: sourceTag,
            imagePromptUsed: asset.aiDescription ?? asset.name ?? null,
            // No AI provider — this image came from the library.
            aiProvider: null,
            aiModel: null,
            generationDuration: 0,
            status: 'GENERATED',
            generatedAt: new Date(),
            iterationCount: 0,
          },
          select: { id: true, imageUrl: true, imagePromptUsed: true },
        });
        created.push({
          id: row.id,
          url: row.imageUrl ?? '',
          prompt: row.imagePromptUsed ?? '',
        });
      }
      return created;
    });

    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));

    return NextResponse.json({
      variants: components,
      source: 'library',
    });
  } catch (err) {
    console.error('[select-library-visual] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
