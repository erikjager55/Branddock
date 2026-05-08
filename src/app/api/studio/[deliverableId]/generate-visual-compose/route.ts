// =============================================================================
// POST /api/studio/[deliverableId]/generate-visual-compose
//
// Phase 4 of the Visual Brief — composes a new image from 2-9 reference
// MediaAssets in the workspace plus a natural-language compose instruction.
// Calls fal.ai's FLUX Pro Kontext multi-reference endpoint, which supports
// blending multiple reference images into a single composition.
//
// Inputs (visualBrief.compose):
//   - referenceIds: string[]  (2-9 MediaAsset IDs from the workspace)
//   - instruction: string     (e.g. "Sarah holding the product in a coffee shop")
//
// We pass the instruction as the prompt and the asset URLs as image_urls. The
// chip's composition rule is appended via buildVisualBriefImagePrompts so the
// final image still inherits the style direction.
// =============================================================================
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { withAiRateLimit } from '@/lib/ai/middleware';
import { assembleCanvasContext, type CanvasContextStack } from '@/lib/ai/canvas-context';
import { buildVisualBriefImagePrompts } from '@/lib/ai/visual-brief-prompts';
import { runFalGeneration } from '@/lib/integrations/fal/fal-client';
import { fetchWithSizeLimit, AI_IMAGE_SIZE_CAP } from '@/lib/security/fetch-with-limit';
import { scoreImageFidelity } from '@/lib/brand-fidelity/visual-fidelity-scorer';
import { getStorageProvider } from '@/lib/storage';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

const VISUAL_GROUP = 'visual';
const COMPOSE_ENDPOINT = 'fal-ai/flux-pro/kontext/multi';

type FalImageSize =
  | 'square_hd'
  | 'landscape_16_9'
  | 'portrait_16_9'
  | 'landscape_4_3'
  | 'portrait_4_3';

function widthHeightToFalSize(width: number, height: number): FalImageSize {
  if (!width || !height) return 'square_hd';
  const ratio = width / height;
  const candidates: Array<{ size: FalImageSize; ratio: number }> = [
    { size: 'square_hd', ratio: 1 },
    { size: 'landscape_16_9', ratio: 16 / 9 },
    { size: 'portrait_16_9', ratio: 9 / 16 },
    { size: 'landscape_4_3', ratio: 4 / 3 },
    { size: 'portrait_4_3', ratio: 3 / 4 },
  ];
  let best = candidates[0];
  let bestDelta = Math.abs(Math.log(ratio / best.ratio));
  for (const c of candidates.slice(1)) {
    const delta = Math.abs(Math.log(ratio / c.ratio));
    if (delta < bestDelta) {
      bestDelta = delta;
      best = c;
    }
  }
  return best.size;
}

function falSizeToAspectLabel(size: FalImageSize): string {
  return {
    square_hd: '1:1',
    landscape_16_9: '16:9',
    portrait_16_9: '9:16',
    landscape_4_3: '4:3',
    portrait_4_3: '3:4',
  }[size];
}

function falSizeToAspectRatio(size: FalImageSize): string {
  return {
    square_hd: '1:1',
    landscape_16_9: '16:9',
    portrait_16_9: '9:16',
    landscape_4_3: '4:3',
    portrait_4_3: '3:4',
  }[size];
}

function resolveAspectFromMedium(stack: CanvasContextStack): FalImageSize | null {
  const specs = stack.medium?.specs as Record<string, unknown> | undefined;
  if (!specs) return null;
  const candidates = [specs.imageSize, specs.heroImageSize, specs.videoSize];
  for (const raw of candidates) {
    if (raw && typeof raw === 'object') {
      const obj = raw as { width?: unknown; height?: unknown };
      if (typeof obj.width === 'number' && typeof obj.height === 'number') {
        return widthHeightToFalSize(obj.width, obj.height);
      }
    }
  }
  return null;
}

const FAL_SIZE_FOR_LABEL = {
  '1:1': 'square_hd',
  '16:9': 'landscape_16_9',
  '9:16': 'portrait_16_9',
  '4:3': 'landscape_4_3',
  '3:4': 'portrait_4_3',
} as const satisfies Record<string, FalImageSize>;

const requestSchema = z
  .object({
    aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional(),
    count: z.number().int().min(1).max(3).optional(),
  })
  .strict()
  .or(z.undefined());

interface RouteParams {
  params: Promise<{ deliverableId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
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

    const { deliverableId } = await params;

    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      select: { id: true, settings: true, contentType: true },
    });
    if (!deliverable) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let body: z.infer<typeof requestSchema>;
    try {
      const raw = await request.text();
      body = raw ? requestSchema.parse(JSON.parse(raw)) : undefined;
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const settings = (deliverable.settings ?? {}) as Record<string, unknown>;
    const visualBrief = settings.visualBrief as Record<string, unknown> | null;
    const source = visualBrief?.source ?? null;
    if (source !== 'compose') {
      return NextResponse.json(
        { error: `Visual Brief source is "${source}" — switch to "compose" on Step 1 first.` },
        { status: 400 },
      );
    }

    const composeConfig = visualBrief?.compose as
      | { referenceIds?: string[]; instruction?: string }
      | undefined;
    const referenceIds = Array.isArray(composeConfig?.referenceIds) ? composeConfig.referenceIds : [];
    const instruction = composeConfig?.instruction?.trim() ?? '';

    if (referenceIds.length < 2 || referenceIds.length > 9) {
      return NextResponse.json(
        { error: 'Compose requires 2-9 reference images. Update your selection in Step 2.' },
        { status: 400 },
      );
    }
    if (!instruction) {
      return NextResponse.json(
        { error: 'Compose requires an instruction describing the desired composition.' },
        { status: 400 },
      );
    }

    // Fetch reference assets — must all be in this workspace and have URLs.
    const assets = await prisma.mediaAsset.findMany({
      where: { id: { in: referenceIds }, workspaceId, isArchived: false },
      select: { id: true, fileUrl: true, mediaType: true },
    });
    const referenceUrls = assets
      .filter((a) => a.mediaType === 'IMAGE' && typeof a.fileUrl === 'string' && a.fileUrl.length > 0)
      .map((a) => a.fileUrl);
    if (referenceUrls.length < 2) {
      return NextResponse.json(
        { error: 'Could not resolve at least 2 reference images. Some assets may be archived or non-image.' },
        { status: 400 },
      );
    }

    const stack = await assembleCanvasContext(deliverableId, workspaceId);
    if (!stack.visualBrief) {
      stack.visualBrief = {
        source: 'compose',
        styleDirection: null,
        styleDirectionFreeText: null,
        compose: { referenceIds, instruction },
      };
    }

    const promptCount = body?.count ?? 2;
    const basePrompts = buildVisualBriefImagePrompts(
      stack.visualBrief,
      stack.brand,
      {
        keyMessage: stack.brief?.keyMessage ?? null,
        objective: stack.brief?.objective ?? null,
        callToAction: stack.brief?.callToAction ?? null,
        personas: stack.personas,
        products: stack.products,
        creativePlatform: stack.concept?.creativePlatform ?? null,
        platform: stack.medium?.platform ?? null,
      },
      promptCount,
    );

    // The compose instruction IS the subject — prepend it so kontext/multi
    // anchors on it. buildVisualBriefImagePrompts already injects the chip's
    // composition rule + brand identity for stylistic coherence.
    const finalPrompts = basePrompts.map((p) => `${instruction}. ${p}`);

    const explicitFalSize = body?.aspectRatio ? FAL_SIZE_FOR_LABEL[body.aspectRatio] : null;
    const falImageSize: FalImageSize =
      explicitFalSize ?? resolveAspectFromMedium(stack) ?? 'square_hd';
    const aspectLabel = falSizeToAspectLabel(falImageSize);
    const aspectRatio = falSizeToAspectRatio(falImageSize);

    const startMs = Date.now();
    const generated = await Promise.all(
      finalPrompts.map(async (prompt) => {
        try {
          // kontext/multi expects: prompt + image_urls (array) + aspect_ratio
          const result = await runFalGeneration(COMPOSE_ENDPOINT, {
            prompt,
            image_urls: referenceUrls,
            num_images: 1,
            guidance_scale: 3.5,
            aspect_ratio: aspectRatio,
            output_format: 'png',
          });
          const url = result.images?.[0]?.url;
          if (!url) return null;
          return { prompt, hostedUrl: url };
        } catch (err) {
          console.error(
            `[generate-visual-compose] ${COMPOSE_ENDPOINT} call failed:`,
            err instanceof Error ? err.message : err,
          );
          return null;
        }
      }),
    );

    const successful = generated.filter((r): r is NonNullable<typeof r> => r !== null);
    if (successful.length === 0) {
      return NextResponse.json(
        { error: `All compose generation calls failed (${COMPOSE_ENDPOINT}). Check that FAL_KEY is configured.` },
        { status: 502 },
      );
    }

    const storage = getStorageProvider();
    const uploads = await Promise.all(
      successful.map(async (img, idx) => {
        const bytes = await fetchWithSizeLimit(img.hostedUrl, AI_IMAGE_SIZE_CAP);
        const fileName = `canvas-visual-compose-${deliverableId}-${Date.now()}-${idx}.png`;
        const upload = await storage.upload(bytes, {
          workspaceId,
          fileName,
          contentType: 'image/png',
        });
        return { url: upload.url, prompt: img.prompt };
      }),
    );

    const elapsedMs = Date.now() - startMs;

    const components = await prisma.$transaction(async (tx) => {
      await tx.deliverableComponent.deleteMany({
        where: { deliverableId, variantGroup: VISUAL_GROUP },
      });
      const baseOrder = await tx.deliverableComponent.count({ where: { deliverableId } });
      const created: Array<{ id: string; url: string; prompt: string }> = [];
      for (let i = 0; i < uploads.length; i++) {
        const u = uploads[i];
        const row = await tx.deliverableComponent.create({
          data: {
            deliverableId,
            componentType: 'image',
            groupType: 'variant',
            order: baseOrder + i,
            variantGroup: VISUAL_GROUP,
            variantIndex: i,
            isSelected: i === 0,
            imageUrl: u.url,
            imageSource: 'ai_generated',
            imagePromptUsed: u.prompt,
            aiProvider: 'fal',
            aiModel: COMPOSE_ENDPOINT,
            generationDuration: elapsedMs,
            status: 'GENERATED',
            generatedAt: new Date(),
            iterationCount: 0,
          },
          select: { id: true, imageUrl: true, imagePromptUsed: true },
        });
        created.push({ id: row.id, url: row.imageUrl ?? '', prompt: row.imagePromptUsed ?? '' });
      }
      return created;
    });

    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));

    // G8 — fire-and-forget visual fidelity scoring for the new components.
    // Each call costs ~$0.04 (Claude vision) and runs ~12-15s. We don't
    // await so the route returns immediately with variants; the client's
    // components query refetches after a delay to pick up the scores.
    void Promise.allSettled(
      components.map((c) =>
        scoreImageFidelity({ componentId: c.id, workspaceId }),
      ),
    ).catch(() => {
      /* individual failures are logged inside scoreImageFidelity */
    });

    return NextResponse.json({
      variants: components,
      provider: 'fal',
      model: COMPOSE_ENDPOINT,
      source: 'compose',
      referenceCount: referenceUrls.length,
      aspectRatio: aspectLabel,
      generationDuration: elapsedMs,
    });
  } catch (err) {
    console.error('[generate-visual-compose] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
