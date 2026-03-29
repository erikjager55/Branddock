import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { z } from 'zod';
import { mapStyleReference } from '@/features/media-library/utils/media-utils';

/** GET /api/media/style-references/[id] — Get a single style reference */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const reference = await prisma.styleReference.findFirst({
      where: { id, workspaceId },
    });

    if (!reference) {
      return NextResponse.json(
        { error: 'Style reference not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(mapStyleReference(reference as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Error fetching style reference:', error);
    return NextResponse.json(
      { error: 'Failed to fetch style reference' },
      { status: 500 }
    );
  }
}

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(['BRAND_MODEL', 'PHOTOGRAPHY_STYLE', 'ANIMATION_STYLE']).optional(),
  stylePrompt: z.string().max(5000).nullable().optional(),
  negativePrompt: z.string().max(5000).nullable().optional(),
  generationParams: z.record(z.string(), z.unknown()).nullable().optional(),
  modelName: z.string().max(200).nullable().optional(),
  modelDescription: z.string().max(5000).nullable().optional(),
  referenceImages: z.array(z.string().url()).max(20).optional(),
});

/** PATCH /api/media/style-references/[id] — Update a style reference */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.styleReference.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Style reference not found' },
        { status: 404 }
      );
    }

    const { generationParams, ...rest } = parsed.data;

    const updated = await prisma.styleReference.update({
      where: { id },
      data: {
        ...rest,
        ...(generationParams !== undefined
          ? {
              generationParams: generationParams === null
                ? Prisma.JsonNull
                : (generationParams as unknown as Prisma.InputJsonValue),
            }
          : {}),
      },
    });

    invalidateCache(cacheKeys.media.styleRefs(workspaceId));
    invalidateCache(cacheKeys.prefixes.media(workspaceId));

    return NextResponse.json(mapStyleReference(updated as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Error updating style reference:', error);
    return NextResponse.json(
      { error: 'Failed to update style reference' },
      { status: 500 }
    );
  }
}

/** DELETE /api/media/style-references/[id] — Delete a style reference */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.styleReference.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Style reference not found' },
        { status: 404 }
      );
    }

    await prisma.styleReference.delete({ where: { id } });

    invalidateCache(cacheKeys.media.styleRefs(workspaceId));
    invalidateCache(cacheKeys.prefixes.media(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting style reference:', error);
    return NextResponse.json(
      { error: 'Failed to delete style reference' },
      { status: 500 }
    );
  }
}
