import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { z } from 'zod';
import { mapStyleReference } from '@/features/media-library/utils/media-utils';

/** GET /api/media/style-references — List style references for workspace */
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type') || '';

    const where: Record<string, unknown> = { workspaceId };
    if (type) {
      where.type = type;
    }

    const references = await prisma.styleReference.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      styleReferences: references.map(r => mapStyleReference(r as unknown as Record<string, unknown>)),
      total: references.length,
    });
  } catch (error) {
    console.error('Error fetching style references:', error);
    return NextResponse.json(
      { error: 'Failed to fetch style references' },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['BRAND_MODEL', 'PHOTOGRAPHY_STYLE', 'ANIMATION_STYLE']),
  stylePrompt: z.string().max(5000).optional(),
  negativePrompt: z.string().max(5000).optional(),
  generationParams: z.record(z.string(), z.unknown()).optional(),
  modelName: z.string().max(200).optional(),
  modelDescription: z.string().max(5000).optional(),
  referenceImages: z.array(z.string().url()).max(20).optional().default([]),
});

/** POST /api/media/style-references — Create a new style reference */
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { generationParams, ...rest } = parsed.data;

    const reference = await prisma.styleReference.create({
      data: {
        ...rest,
        generationParams: generationParams
          ? (generationParams as unknown as Prisma.InputJsonValue)
          : undefined,
        workspaceId,
      },
    });

    invalidateCache(cacheKeys.media.styleRefs(workspaceId));
    invalidateCache(cacheKeys.prefixes.media(workspaceId));

    return NextResponse.json(
      { styleReference: mapStyleReference(reference as unknown as Record<string, unknown>) },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating style reference:', error);
    return NextResponse.json(
      { error: 'Failed to create style reference' },
      { status: 500 }
    );
  }
}
