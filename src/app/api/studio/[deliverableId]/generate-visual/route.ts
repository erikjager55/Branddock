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
import { assembleCanvasContext } from '@/lib/ai/canvas-context';
import { buildVisualBriefImagePrompts } from '@/lib/ai/visual-brief-prompts';
import { generateImage } from '@/lib/ai/gemini-client';
import { getStorageProvider } from '@/lib/storage';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { z } from 'zod';

const VISUAL_GROUP = 'visual';

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

    // Generate via Imagen 4 (default for v1 — provider picker is Phase 5)
    const aspectRatio = body?.aspectRatio ?? '1:1';
    const startMs = Date.now();
    const imageBuffers = await Promise.all(
      finalPrompts.map(async (prompt) => {
        try {
          const result = await generateImage(prompt, { aspectRatio });
          return { prompt, bytes: result.imageBytes, mimeType: result.mimeType };
        } catch (err) {
          console.error('[generate-visual] Imagen call failed:', err instanceof Error ? err.message : err);
          return null;
        }
      }),
    );

    const successful = imageBuffers.filter((r): r is NonNullable<typeof r> => r !== null);
    if (successful.length === 0) {
      return NextResponse.json(
        { error: 'All image generation calls failed. Check that GEMINI_API_KEY is configured.' },
        { status: 502 },
      );
    }

    // Upload to storage
    const storage = getStorageProvider();
    const uploads = await Promise.all(
      successful.map(async (img, idx) => {
        const fileName = `canvas-visual-${deliverableId}-${Date.now()}-${idx}.png`;
        const upload = await storage.upload(img.bytes, {
          workspaceId,
          fileName,
          contentType: img.mimeType,
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
            aiProvider: 'google',
            aiModel: 'imagen-4.0-generate-001',
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
      provider: 'google',
      model: 'imagen-4.0-generate-001',
      generationDuration: elapsedMs,
    });
  } catch (err) {
    console.error('[generate-visual] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
