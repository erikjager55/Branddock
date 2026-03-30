import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { getStorageProvider } from '@/lib/storage';
import { z } from 'zod';
import { generateImage } from '@/lib/ai/gemini-client';
import { generateDalleImage } from '@/lib/ai/openai-client';
import { mapGeneratedImage } from '@/features/media-library/utils/media-utils';

const generateSchema = z.object({
  name: z.string().min(1).max(200),
  prompt: z.string().min(1).max(1000),
  provider: z.enum(['IMAGEN', 'DALLE']),
  // Imagen options
  aspectRatio: z.string().optional(),
  // DALL-E options
  size: z.enum(['1024x1024', '1792x1024', '1024x1792']).optional(),
  quality: z.enum(['standard', 'hd']).optional(),
  style: z.enum(['vivid', 'natural']).optional(),
});

/** POST /api/media/ai-images/generate — Generate an image via Imagen 4 or DALL-E 3 */
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
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, prompt, provider, aspectRatio, size, quality, style } = parsed.data;

    let imageBytes: Buffer;
    let mimeType: string;
    let revisedPrompt: string | undefined;
    let modelName: string;
    let width: number | undefined;
    let height: number | undefined;
    let resolvedAspectRatio: string | undefined;

    if (provider === 'IMAGEN') {
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json(
          { error: 'Google Gemini API key is not configured. Add GEMINI_API_KEY to enable Imagen image generation.' },
          { status: 400 }
        );
      }

      const result = await generateImage(prompt, {
        aspectRatio: aspectRatio ?? '1:1',
      });
      imageBytes = result.imageBytes;
      mimeType = result.mimeType;
      modelName = 'imagen-4.0-generate-001';
      resolvedAspectRatio = aspectRatio ?? '1:1';
    } else {
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
          { error: 'OpenAI API key is not configured. Add OPENAI_API_KEY to enable DALL-E image generation.' },
          { status: 400 }
        );
      }

      const dalleSize = size ?? '1024x1024';
      const result = await generateDalleImage(prompt, {
        size: dalleSize,
        quality: quality ?? 'standard',
        style: style ?? 'vivid',
      });
      imageBytes = result.imageBytes;
      mimeType = result.mimeType;
      revisedPrompt = result.revisedPrompt;
      modelName = 'dall-e-3';

      // Parse dimensions from size
      const [w, h] = dalleSize.split('x').map(Number);
      width = w;
      height = h;
      // Derive aspect ratio from DALL-E size
      if (dalleSize === '1024x1024') resolvedAspectRatio = '1:1';
      else if (dalleSize === '1792x1024') resolvedAspectRatio = '16:9';
      else if (dalleSize === '1024x1792') resolvedAspectRatio = '9:16';
    }

    // Upload to storage
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const fileName = `${slug || 'ai-image'}-${Date.now()}.${ext}`;
    const storageProvider = getStorageProvider();
    const uploadResult = await storageProvider.upload(imageBytes, {
      workspaceId,
      fileName,
      contentType: mimeType,
    });

    // Create DB record — clean up storage file if DB write fails
    let image;
    try {
      image = await prisma.generatedImage.create({
        data: {
          name,
          prompt,
          revisedPrompt: revisedPrompt ?? null,
          provider,
          model: modelName,
          fileUrl: uploadResult.url,
          fileName,
          fileSize: uploadResult.fileSize,
          fileType: mimeType,
          width: width ?? null,
          height: height ?? null,
          aspectRatio: resolvedAspectRatio ?? null,
          style: style ?? null,
          quality: quality ?? null,
          workspaceId,
          createdById: session.user.id,
        },
      });
    } catch (dbError) {
      try { await storageProvider.delete(uploadResult.url); } catch { /* best-effort cleanup */ }
      throw dbError;
    }

    invalidateCache(cacheKeys.media.aiImages(workspaceId));
    invalidateCache(cacheKeys.prefixes.media(workspaceId));

    return NextResponse.json(
      mapGeneratedImage(image as unknown as Record<string, unknown>),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: 'Failed to generate image. Please try again.' },
      { status: 500 }
    );
  }
}
