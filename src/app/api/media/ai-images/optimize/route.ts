import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fal } from '@fal-ai/client';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { getStorageProvider } from '@/lib/storage';
import { z } from 'zod';
import { getFalOptimizeProviderById } from '@/lib/integrations/fal/fal-optimize-providers';
import { mapGeneratedImage } from '@/features/media-library/utils/media-utils';

const optimizeSchema = z.object({
  name: z.string().min(1).max(200),
  sourceImageUrl: z.string().min(1),
  provider: z.string().min(1),
  /** Optional prompt for models that support it (e.g. creative upscaler) */
  prompt: z.string().max(1000).optional(),
});

/** POST /api/media/ai-images/optimize — Optimize an existing image via fal.ai */
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = optimizeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, sourceImageUrl, provider: providerId, prompt } = parsed.data;

    const provider = getFalOptimizeProviderById(providerId);
    if (!provider) {
      return NextResponse.json({ error: `Unknown optimize provider: ${providerId}` }, { status: 400 });
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json(
        { error: 'FAL_KEY is not configured.' },
        { status: 400 }
      );
    }

    fal.config({ credentials: process.env.FAL_KEY });

    // Resolve local file URLs to fal.ai storage
    let resolvedImageUrl = sourceImageUrl;
    if (sourceImageUrl.startsWith('/uploads/') || sourceImageUrl.startsWith('/public/uploads/')) {
      const localPath = join(process.cwd(), 'public', sourceImageUrl.replace(/^\/public/, ''));
      const fileBytes = await readFile(localPath);
      const fileName = sourceImageUrl.split('/').pop() ?? 'source.jpg';
      const mimeType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
      const blob = new Blob([fileBytes], { type: mimeType });
      const file = new File([blob], fileName, { type: mimeType });
      resolvedImageUrl = await fal.storage.upload(file);
    }

    // Build input — handle per-model differences in field names and formats
    const isStyleTransfer = provider.id === 'style-transfer';
    const imageValue = provider.imageUrlIsArray ? [resolvedImageUrl] : resolvedImageUrl;
    const input: Record<string, unknown> = {
      [provider.imageUrlField]: imageValue,
      ...provider.fixedParams,
      ...(prompt?.trim()
        ? isStyleTransfer
          ? { target_style: prompt.trim() }
          : { prompt: prompt.trim() }
        : {}),
    };

    console.log('[image-optimize] endpoint:', provider.endpoint, 'input keys:', Object.keys(input));

    const result = await fal.subscribe(provider.endpoint, {
      input,
      timeout: 180_000,
    });

    const data = result.data as Record<string, unknown>;

    // Different models return images in different formats
    let imageUrl: string | undefined;
    if (data?.image && typeof (data.image as Record<string, unknown>)?.url === 'string') {
      imageUrl = (data.image as { url: string }).url;
    } else if (Array.isArray(data?.images) && (data.images as Array<{ url: string }>)[0]?.url) {
      imageUrl = (data.images as Array<{ url: string }>)[0].url;
    } else if (typeof data?.output_url === 'string') {
      imageUrl = data.output_url as string;
    }

    if (!imageUrl) {
      console.error('[image-optimize] no image in response:', JSON.stringify(data));
      return NextResponse.json({ error: 'No optimized image returned' }, { status: 500 });
    }

    // Download optimized image
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) {
      return NextResponse.json({ error: 'Failed to download optimized image' }, { status: 500 });
    }
    const imageBytes = Buffer.from(await imgResponse.arrayBuffer());
    const mimeType = 'image/png';

    // Upload to storage
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const ext = 'png';
    const fileName = `${slug || 'optimized'}-${Date.now()}.${ext}`;
    const storageProvider = getStorageProvider();
    const uploadResult = await storageProvider.upload(imageBytes, {
      workspaceId,
      fileName,
      contentType: mimeType,
    });

    // Save as GeneratedImage (so it appears in AI Studio)
    const image = await prisma.generatedImage.create({
      data: {
        name,
        prompt: prompt ?? `${provider.label}: ${name}`,
        revisedPrompt: null,
        provider: providerId,
        model: provider.label,
        fileUrl: uploadResult.url,
        fileName,
        fileSize: uploadResult.fileSize,
        fileType: mimeType,
        width: null,
        height: null,
        aspectRatio: null,
        style: null,
        quality: null,
        workspaceId,
        createdById: session.user.id,
      },
    });

    invalidateCache(cacheKeys.media.aiImages(workspaceId));
    invalidateCache(cacheKeys.prefixes.media(workspaceId));

    return NextResponse.json(
      mapGeneratedImage(image as unknown as Record<string, unknown>),
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const body = (error as Record<string, unknown>)?.body;
    const detail = body ? JSON.stringify(body) : '';
    console.error('Error optimizing image:', message, detail);
    return NextResponse.json(
      { error: `Image optimization failed: ${message}${detail ? ` — ${detail}` : ''}` },
      { status: 500 }
    );
  }
}
