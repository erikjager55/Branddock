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
import { buildAiErrorResponseInit } from '@/lib/ai/error-handler';
import { getServerSession } from '@/lib/auth-server';
import { resolveDeliverableWorkspaceId } from '@/lib/deliverable/deliverable-access';
import { prisma } from '@/lib/prisma';
import { withAiRateLimit } from '@/lib/ai/middleware';
import { assembleCanvasContext, type CanvasContextStack } from '@/lib/ai/canvas-context';
import { buildVisualBriefImagePrompts } from '@/lib/ai/visual-brief-prompts';
import { getMultiCandidateDefault } from '@/features/campaigns/lib/deliverable-types';
import {
  composeFromImages,
  ComposeInvalidImageError,
  ComposePolicyBlockedError,
  ComposeQuotaError,
  ComposeNetworkError,
  type GeminiAspectLabel,
} from '@/lib/ai/gemini-client';
import { scoreImageFidelity } from '@/lib/brand-fidelity/visual-fidelity-scorer';
import { getStorageProvider } from '@/lib/storage';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { ingestUploadsToLibrary } from '@/lib/media/ingest-uploads-to-library';
import { patchHeroVisualUrl } from '@/lib/deliverable/patch-hero-visual';

const VISUAL_GROUP = 'visual';
const COMPOSE_MODEL = 'gemini-2.5-flash-image';
const COMPOSE_PROVIDER = 'google';

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
    // 'hero' in de LP-flow → wire de geüploade compositie server-side in
    // puckData.BrandHero + structuredVariant.hero (orphaned-hero-preventie).
    target: z.enum(['hero']).optional(),
  })
  .strict()
  .or(z.undefined());

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

    const promptCount = body?.count
      ?? getMultiCandidateDefault(stack.deliverableTypeId ?? '');
    const { prompts: basePrompts, negativePrompt } = buildVisualBriefImagePrompts(
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
        deliverableTypeId: stack.deliverableTypeId ?? null,
      },
      promptCount,
    );

    // The compose instruction IS the subject — prepend it so kontext/multi
    // anchors on it. buildVisualBriefImagePrompts already injects the chip's
    // composition rule + brand identity for stylistic coherence.
    // Pattern A image-quality-chain: Gemini Image heeft geen native
    // negative-prompt parameter — appendi het als prompt-directive.
    const negativeDirective = negativePrompt
      ? ` Avoid: ${negativePrompt}.`
      : '';
    const finalPrompts = basePrompts.map((p) => `${instruction}. ${p}${negativeDirective}`);

    const explicitFalSize = body?.aspectRatio ? FAL_SIZE_FOR_LABEL[body.aspectRatio] : null;
    const falImageSize: FalImageSize =
      explicitFalSize ?? resolveAspectFromMedium(stack) ?? 'square_hd';
    const aspectLabel = falSizeToAspectLabel(falImageSize);
    const aspectRatio = falSizeToAspectRatio(falImageSize);

    const geminiAspect: GeminiAspectLabel = (aspectRatio as GeminiAspectLabel) ?? '1:1';
    const startMs = Date.now();

    // Track any typed errors per-prompt zodat we de eerste specifieke error
    // kunnen surface'en aan de user i.p.v. een generieke fail-all message.
    const errors: Array<{
      code: 'invalid-image' | 'policy' | 'quota' | 'network' | 'unknown';
      message: string;
    }> = [];

    const generated = await Promise.all(
      finalPrompts.map(async (prompt) => {
        try {
          const result = await composeFromImages(referenceUrls, prompt, {
            aspectRatio: geminiAspect,
          });
          return { prompt, imageBytes: result.imageBytes, mimeType: result.mimeType };
        } catch (err) {
          if (err instanceof ComposeInvalidImageError) {
            errors.push({ code: 'invalid-image', message: err.message });
          } else if (err instanceof ComposePolicyBlockedError) {
            errors.push({ code: 'policy', message: err.message });
          } else if (err instanceof ComposeQuotaError) {
            errors.push({ code: 'quota', message: err.message });
          } else if (err instanceof ComposeNetworkError) {
            errors.push({ code: 'network', message: err.message });
          } else {
            errors.push({
              code: 'unknown',
              message: err instanceof Error ? err.message : 'Unknown compose error',
            });
          }
          console.error(
            `[generate-visual-compose] ${COMPOSE_MODEL} call failed:`,
            err instanceof Error ? err.message : err,
          );
          return null;
        }
      }),
    );

    const successful = generated.filter((r): r is NonNullable<typeof r> => r !== null);
    if (successful.length === 0) {
      const firstErr = errors[0];
      if (firstErr?.code === 'policy') {
        return NextResponse.json(
          {
            error:
              'Content policy: image was rejected by Gemini safety filter. Adjust your instruction or pick different references.',
            code: firstErr.code,
          },
          { status: 422 },
        );
      }
      if (firstErr?.code === 'invalid-image') {
        return NextResponse.json(
          {
            error:
              'One or more reference images could not be fetched. Make sure your images are publicly accessible (deploy required for local URLs).',
            code: firstErr.code,
            details: firstErr.message,
          },
          { status: 400 },
        );
      }
      if (firstErr?.code === 'quota' || firstErr?.code === 'network') {
        return NextResponse.json(
          {
            error:
              firstErr.code === 'quota'
                ? 'Gemini quota exceeded. Try again in a moment or contact support.'
                : 'Network error reaching Gemini. Try again in a moment.',
            code: firstErr.code,
          },
          { status: 502 },
        );
      }
      return NextResponse.json(
        {
          error: `Compose generation failed: ${firstErr?.message ?? 'unknown error'}`,
          code: firstErr?.code ?? 'unknown',
        },
        { status: 502 },
      );
    }

    const storage = getStorageProvider();
    const uploads = await Promise.all(
      successful.map(async (img, idx) => {
        const ext = img.mimeType === 'image/jpeg' ? 'jpg' : 'png';
        const fileName = `canvas-visual-compose-${deliverableId}-${Date.now()}-${idx}.${ext}`;
        const upload = await storage.upload(img.imageBytes, {
          workspaceId,
          fileName,
          contentType: img.mimeType,
        });
        return {
          url: upload.url,
          prompt: img.prompt,
          fileSize: img.imageBytes.length,
          contentType: img.mimeType,
        };
      }),
    );

    // LP-hero-wiring (gedeelde helper, gelijk aan generate-visual): bust de
    // eerste compositie-URL in puckData.BrandHero zodat de pagina ermee rendert.
    if (body?.target === 'hero' && uploads[0]?.url) {
      await patchHeroVisualUrl(deliverableId, uploads[0].url);
    }

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
            aiProvider: COMPOSE_PROVIDER,
            aiModel: COMPOSE_MODEL,
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

    // Library-groei (#325-patroon): elk samengesteld AI-beeld als MediaAsset
    // voor hergebruik via library-first matching. Uploads dragen hun eigen mime
    // (jpg/png). Fire-and-forget — faalt nooit de generatie.
    ingestUploadsToLibrary(uploads, {
      workspaceId,
      uploadedById: session.user.id,
      deliverableTypeId: stack.deliverableTypeId,
      defaultContentType: 'image/png',
    });

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
      provider: COMPOSE_PROVIDER,
      model: COMPOSE_MODEL,
      source: 'compose',
      referenceCount: referenceUrls.length,
      aspectRatio: aspectLabel,
      generationDuration: elapsedMs,
    });
  } catch (err) {
    console.error('[generate-visual-compose] error:', err);
    const { body, status } = buildAiErrorResponseInit(err);
    return NextResponse.json(body, { status });
  }
}
