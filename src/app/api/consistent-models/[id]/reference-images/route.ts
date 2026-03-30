import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, requireAuth } from '@/lib/auth-server';
import { validateTrainingImage, stripExifData, MAX_REFERENCE_IMAGES } from '@/lib/storage/image-validator';
import { generateThumbnail } from '@/lib/storage/thumbnail-generator';
import { uploadToR2, buildModelStorageKey } from '@/lib/storage/r2-storage';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/consistent-models/:id/reference-images — List reference images */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 });
    }

    const { id } = await context.params;

    // Verify model ownership
    const model = await prisma.consistentModel.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    const images = await prisma.referenceImage.findMany({
      where: { consistentModelId: id },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ images });
  } catch (error) {
    console.error('GET /api/consistent-models/:id/reference-images error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/consistent-models/:id/reference-images — Upload reference images */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 });
    }

    const { id } = await context.params;

    // Verify model ownership
    const model = await prisma.consistentModel.findFirst({
      where: { id, workspaceId },
      include: { _count: { select: { referenceImages: true } } },
    });

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No image files provided. Use "images" field in multipart/form-data.' },
        { status: 400 }
      );
    }

    // Check max images limit
    const currentCount = model._count.referenceImages;
    if (currentCount + files.length > MAX_REFERENCE_IMAGES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_REFERENCE_IMAGES} reference images per model. Currently ${currentCount}, trying to add ${files.length}.` },
        { status: 400 }
      );
    }

    const uploaded = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 1. Validate image
        const validation = await validateTrainingImage(buffer, file.type);
        if (!validation.isValid) {
          errors.push({ fileName: file.name, error: validation.error });
          continue;
        }

        // 2. Strip EXIF data
        const cleanBuffer = await stripExifData(buffer);

        // 3. Generate thumbnail
        const thumbBuffer = await generateThumbnail(cleanBuffer);

        // 4. Upload original to R2
        const storageKey = buildModelStorageKey(workspaceId, id, file.name);
        const { url: storageUrl } = await uploadToR2(storageKey, cleanBuffer, validation.mimeType);

        // 5. Upload thumbnail to R2
        const thumbKey = buildModelStorageKey(workspaceId, id, file.name, true);
        const { url: thumbnailUrl } = await uploadToR2(thumbKey, thumbBuffer, 'image/jpeg');

        // 6. Create ReferenceImage record
        const image = await prisma.referenceImage.create({
          data: {
            consistentModelId: id,
            fileName: file.name,
            fileSize: cleanBuffer.length,
            mimeType: validation.mimeType,
            width: validation.width,
            height: validation.height,
            storageKey,
            storageUrl,
            thumbnailKey: thumbKey,
            thumbnailUrl,
            sortOrder: currentCount + i,
            isTrainingImage: true,
          },
        });

        uploaded.push(image);
      } catch (fileError) {
        const msg = fileError instanceof Error ? fileError.message : 'Upload failed';
        errors.push({ fileName: file.name, error: msg });
      }
    }

    if (uploaded.length > 0) {
      invalidateCache(cacheKeys.prefixes.consistentModels(workspaceId));
    }

    return NextResponse.json({
      uploaded,
      errors,
      total: currentCount + uploaded.length,
    }, { status: uploaded.length > 0 ? 201 : 400 });
  } catch (error) {
    console.error('POST /api/consistent-models/:id/reference-images error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
