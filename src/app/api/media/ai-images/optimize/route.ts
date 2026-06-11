import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fal } from '@fal-ai/client';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { getStorageProvider } from '@/lib/storage';
import { fetchWithSizeLimit, AI_IMAGE_SIZE_CAP, ResponseTooLargeError } from '@/lib/security/fetch-with-limit';
import { z } from 'zod';
import {
  getFalOptimizeProviderById,
  matchStyleTransferTargetStyle,
  STYLE_TRANSFER_TARGET_STYLES,
  type FalOptimizeProvider,
} from '@/lib/integrations/fal/fal-optimize-providers';
import { mapGeneratedImage } from '@/features/media-library/utils/media-utils';
import { withAiRateLimit } from '@/lib/ai/middleware';
import { truncatePromptForModel } from '@/lib/integrations/fal/fal-client';
import { buildNegativePrompt } from '@/lib/ai/image-quality/negative-prompts';

const optimizeSchema = z.object({
  name: z.string().min(1).max(200),
  sourceImageUrl: z.string().min(1),
  provider: z.string().min(1),
  /** Optional prompt for models that support it (e.g. creative upscaler) */
  prompt: z.string().max(1000).optional(),
});

type OptimizeInputResult =
  | { ok: true; input: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Optimize providers with a native `negative_prompt` input (per fal OpenAPI
 * schemas): only the diffusion-based upscalers. The Kontext/Qwen edit models
 * and the deterministic tools (ESRGAN, background removal, face restore)
 * have no such field — fal drops it silently, so sending it there is noise.
 */
const OPTIMIZE_PROVIDER_IDS_WITH_NEGATIVE = new Set(['creative-upscaler', 'clarity-upscaler']);

/**
 * Builds the fal.subscribe input, handling per-model differences in field
 * names. Style-transfer accepts only a fixed `target_style` enum (no prompt
 * field) — free text causes a fal 422 — so unknown styles are rejected here
 * with a user-facing error instead of being forwarded.
 */
function buildOptimizeInput(
  provider: FalOptimizeProvider,
  resolvedImageUrl: string,
  prompt: string | undefined
): OptimizeInputResult {
  const trimmedPrompt = prompt?.trim();
  const base: Record<string, unknown> = {
    [provider.imageUrlField]: provider.imageUrlIsArray ? [resolvedImageUrl] : resolvedImageUrl,
    ...provider.fixedParams,
    // Central quality defaults — this route subscribes directly, which
    // bypassed NEGATIVE_PROMPT_DEFAULTS (prompt-audit 2026-06-11).
    ...(OPTIMIZE_PROVIDER_IDS_WITH_NEGATIVE.has(provider.id)
      ? { negative_prompt: buildNegativePrompt() }
      : {}),
  };

  if (provider.id !== 'style-transfer') {
    return {
      ok: true,
      // Same per-model prompt-cap guard as generateFalImage applies.
      input: trimmedPrompt
        ? { ...base, prompt: truncatePromptForModel(trimmedPrompt, provider.endpoint) }
        : base,
    };
  }

  // No style given → let the provider apply its default ("impressionist")
  if (!trimmedPrompt) {
    return { ok: true, input: base };
  }

  const matchedStyle = matchStyleTransferTargetStyle(trimmedPrompt);
  if (!matchedStyle) {
    return {
      ok: false,
      error:
        `Unknown style "${trimmedPrompt}" — Style Transfer only accepts a fixed set of styles. ` +
        `See allowedStyles for the supported values.`,
    };
  }
  return { ok: true, input: { ...base, target_style: matchedStyle } };
}

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

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

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

    const built = buildOptimizeInput(provider, resolvedImageUrl, prompt);
    if (!built.ok) {
      return NextResponse.json(
        { error: built.error, allowedStyles: STYLE_TRANSFER_TARGET_STYLES },
        { status: 400 }
      );
    }
    const input = built.input;

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

    // Download optimized image with size cap — guards against providers
    // returning oversized responses that would OOM the worker.
    let imageBytes: Buffer;
    try {
      imageBytes = await fetchWithSizeLimit(imageUrl, AI_IMAGE_SIZE_CAP);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to download optimized image';
      const status = err instanceof ResponseTooLargeError ? 502 : 500;
      return NextResponse.json({ error: msg }, { status });
    }
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
