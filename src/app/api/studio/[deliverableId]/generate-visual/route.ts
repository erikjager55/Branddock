// =============================================================================
// POST /api/studio/[deliverableId]/generate-visual
//
// Generates 2 image variants for a deliverable using the Visual Brief
// (settings.visualBrief). Trigger from Canvas Step 2 — server-side image
// generation is no longer coupled to text-gen so this fires only on
// explicit user request.
//
// Flow:
//   1. Validate source === 'generate'
//   2. Build canvas context (brand visual identity + content brief)
//   3. Build 2 image prompts via buildVisualBriefImagePrompts (chip
//      mapping + free text + brand identity + subject seed)
//   4. Generate 2 images via Imagen 4 (default; provider-picker comes later)
//   5. Upload to storage, persist as DeliverableComponent variantGroup='visual'
//   6. Return { variants: [{url, prompt, componentId}] }
//
// Replaces existing visual-group components on each call so the user gets
// fresh variants when they click Regenerate.
// =============================================================================

import { NextResponse } from 'next/server';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { withAiRateLimit } from '@/lib/ai/middleware';
import { assembleCanvasContext, type CanvasContextStack } from '@/lib/ai/canvas-context';
import { buildVisualBriefImagePrompts } from '@/lib/ai/visual-brief-prompts';
import { generateFalImage } from '@/lib/integrations/fal/fal-client';
import { fetchWithSizeLimit, AI_IMAGE_SIZE_CAP } from '@/lib/security/fetch-with-limit';
import { getStorageProvider } from '@/lib/storage';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { z } from 'zod';

const VISUAL_GROUP = 'visual';

/**
 * Default model for Visual Brief generation. FLUX.2 Pro is described in
 * the fal provider registry as "Best overall quality. Excels at sharp
 * details, realistic textures, and consistent lighting across diverse
 * scenes." — strictly higher fidelity than Imagen 4 for marketing /
 * brand visuals.
 */
const DEFAULT_FAL_MODEL = 'fal-ai/flux-2-pro';

/**
 * Standard fal.ai aspect-ratio presets we route to. Mapped from
 * MediumEnrichment.specs.imageSize | heroImageSize | videoSize so each
 * deliverable type generates at its native aspect (LinkedIn 1200x627
 * → 16:9, Instagram 1080x1080 → 1:1, TikTok 1080x1920 → 9:16).
 */
type FalImageSize =
  | 'square_hd'
  | 'landscape_16_9'
  | 'portrait_16_9'
  | 'landscape_4_3'
  | 'portrait_4_3';

/** Map aspect ratio (w/h) to nearest standard preset. */
function widthHeightToFalSize(width: number, height: number): FalImageSize {
  if (!width || !height) return 'square_hd';
  const ratio = width / height;
  // Closest standard match — distances to 1, 16/9, 9/16, 4/3, 3/4.
  const candidates: Array<{ size: FalImageSize; ratio: number }> = [
    { size: 'square_hd',       ratio: 1 },
    { size: 'landscape_16_9',  ratio: 16 / 9 },
    { size: 'portrait_16_9',   ratio: 9 / 16 },
    { size: 'landscape_4_3',   ratio: 4 / 3 },
    { size: 'portrait_4_3',    ratio: 3 / 4 },
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

/** Convert FalImageSize back to "1:1"-style label for the response payload. */
function falSizeToAspectLabel(size: FalImageSize): string {
  return {
    square_hd: '1:1',
    landscape_16_9: '16:9',
    portrait_16_9: '9:16',
    landscape_4_3: '4:3',
    portrait_4_3: '3:4',
  }[size];
}

/**
 * Resolve the right image size from the Medium specs. Looks at
 * `imageSize` first, then `heroImageSize`, then `videoSize` (all
 * stored as { width, height }). Returns null when nothing usable.
 */
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

const requestSchema = z
  .object({
    /** Optional extra steering text appended to every prompt for this run. */
    instruction: z.string().max(1000).optional(),
    /** Override the chip's default aspect ratio — defaults to 1:1. */
    aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional(),
    /** How many variants to generate (1-3). Default 2. */
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

    // Verify ownership
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      select: { id: true, settings: true, contentType: true },
    });
    if (!deliverable) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Body is optional — defaults are fine
    let body: z.infer<typeof requestSchema>;
    try {
      const raw = await request.text();
      body = raw ? requestSchema.parse(JSON.parse(raw)) : undefined;
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const settings = (deliverable.settings ?? {}) as Record<string, unknown>;
    const visualBrief = settings.visualBrief as Record<string, unknown> | null;

    // Source gate — only `generate` runs the AI image pipeline. Library /
    // compose / trained-style are placeholders for future phases. `none`
    // explicitly opts out.
    const source = visualBrief?.source ?? 'generate';
    if (source !== 'generate') {
      return NextResponse.json(
        {
          error: `Visual Brief source is "${source}" — only "generate" runs the AI image pipeline. Switch source on Step 1 first.`,
        },
        { status: 400 },
      );
    }

    // Build the full canvas context — gives us brand visual identity +
    // briefing content so prompts are grounded, not generic.
    const stack = await assembleCanvasContext(deliverableId, workspaceId);

    // Visual Brief from the stack (already parsed by assembleCanvasContext)
    if (!stack.visualBrief) {
      // No brief set yet — synthesize a minimal one so the user can still
      // generate with brand defaults. Style chip stays null which means
      // the prompt skips the chip-specific composition rule.
      stack.visualBrief = {
        source: 'generate',
        styleDirection: null,
        styleDirectionFreeText: null,
      };
    }

    const promptCount = body?.count ?? 2;
    const prompts = buildVisualBriefImagePrompts(
      stack.visualBrief,
      stack.brand,
      {
        keyMessage: stack.brief?.keyMessage ?? null,
        objective: stack.brief?.objective ?? null,
      },
      promptCount,
    );

    // Append optional run-specific instruction to every prompt
    const finalPrompts = body?.instruction
      ? prompts.map((p) => `${p} ${body!.instruction}`)
      : prompts;

    // Resolve aspect ratio — explicit body override beats medium specs
    // beats default 1:1. Medium specs are derived from MediumEnrichment
    // so a LinkedIn post auto-uses 16:9 (1200x627), Instagram 1:1, TikTok
    // 9:16, blog hero 16:9, etc.
    const explicitFalSize = body?.aspectRatio
      ? ({
          '1:1': 'square_hd' as const,
          '16:9': 'landscape_16_9' as const,
          '9:16': 'portrait_16_9' as const,
          '4:3': 'landscape_4_3' as const,
          '3:4': 'portrait_4_3' as const,
        }[body.aspectRatio])
      : null;
    const falImageSize: FalImageSize =
      explicitFalSize ?? resolveAspectFromMedium(stack) ?? 'square_hd';
    const aspectLabel = falSizeToAspectLabel(falImageSize);

    // Generate via FLUX.2 Pro on fal.ai — best overall quality per the
    // provider registry. Each prompt fires a separate call in parallel.
    const startMs = Date.now();
    const generated = await Promise.all(
      finalPrompts.map(async (prompt) => {
        try {
          const result = await generateFalImage(DEFAULT_FAL_MODEL, prompt, {
            imageSize: falImageSize,
            numImages: 1,
          });
          const url = result.images?.[0]?.url;
          if (!url) return null;
          return { prompt, hostedUrl: url };
        } catch (err) {
          console.error('[generate-visual] fal.ai call failed:', err instanceof Error ? err.message : err);
          return null;
        }
      }),
    );

    const successful = generated.filter((r): r is NonNullable<typeof r> => r !== null);
    if (successful.length === 0) {
      return NextResponse.json(
        { error: 'All image generation calls failed. Check that FAL_KEY is configured.' },
        { status: 502 },
      );
    }

    // Download from fal.ai's hosted URL (signed, expires) and upload to
    // our storage so the URL remains stable for downstream usage.
    const storage = getStorageProvider();
    const uploads = await Promise.all(
      successful.map(async (img, idx) => {
        const bytes = await fetchWithSizeLimit(img.hostedUrl, AI_IMAGE_SIZE_CAP);
        const fileName = `canvas-visual-${deliverableId}-${Date.now()}-${idx}.png`;
        const upload = await storage.upload(bytes, {
          workspaceId,
          fileName,
          contentType: 'image/png',
        });
        return { url: upload.url, prompt: img.prompt };
      }),
    );

    // Persist as DeliverableComponent variantGroup='visual'. Replace any
    // existing visual variants — the user clicked Generate, they want fresh.
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
            aiModel: DEFAULT_FAL_MODEL,
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

    return NextResponse.json({
      variants: components,
      provider: 'fal',
      model: DEFAULT_FAL_MODEL,
      aspectRatio: aspectLabel,
      generationDuration: elapsedMs,
    });
  } catch (err) {
    console.error('[generate-visual] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
