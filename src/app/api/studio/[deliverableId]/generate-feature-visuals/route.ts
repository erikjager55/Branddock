// POST /api/studio/[deliverableId]/generate-feature-visuals
//
// P2 + Fase 3 (audit 2026-06-10-lp-feature-image-diversity) — AI-feature-
// beelden voor de feature-cards van een landing-page. v2-contract: de client
// stuurt feature-COPY ({features: [{index, heading, body, imageBrief?}],
// pageHeadline}) en de route bouwt de prompts server-side via
// buildFeatureVisualPrompts (scene-templates + angle-rotatie + sibling-
// differentiatie + per-slot seed). Legacy {prompts: string[]} blijft één
// release werken als deprecated fallback (geen persist op dat pad).
//
// Persist: DeliverableComponent per beeld (variantGroup 'feature-visual:<i>',
// imagePromptUsed/aiModel/generationDuration) — fail-soft naar het patroon van
// generate-visual: persist-falen blokkeert de URLs niet. Apart van
// generate-visual zodat de hero-foto + picker onaangeroerd blijven.
//
// Budget: max 4 slots per pagina (de client capt al; hier hard begrensd).
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { withAiRateLimit } from '@/lib/ai/middleware';
import { assembleCanvasContext } from '@/lib/ai/canvas-context';
import { selectModelForStyle } from '@/lib/ai/visual-brief-prompts';
import { generateFalImage } from '@/lib/integrations/fal/fal-client';
import { buildNegativePrompt } from '@/lib/ai/image-quality/negative-prompts';
import { buildFeatureVisualPrompts, type BuiltFeaturePrompt } from '@/lib/landing-pages/feature-visual-prompts';
import { imageBriefSchema } from '@/lib/landing-pages/variant-schema';
import { fetchWithSizeLimit, AI_IMAGE_SIZE_CAP } from '@/lib/security/fetch-with-limit';
import { getStorageProvider } from '@/lib/storage';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

export const FEATURE_IMAGE_BUDGET = 4;

const featureSlotSchema = z.object({
  index: z.number().int().min(0).max(11),
  heading: z.string().min(1).max(200),
  body: z.string().min(1).max(600),
  imageBrief: imageBriefSchema.nullable().optional(),
});

const requestSchema = z
  .object({
    /** @deprecated legacy pad — client-gebouwde prompts verbatim. */
    prompts: z.array(z.string().min(1).max(1500)).min(1).max(FEATURE_IMAGE_BUDGET).optional(),
    /** v2 — feature-copy; de route bouwt de prompts server-side. */
    features: z.array(featureSlotSchema).min(1).max(FEATURE_IMAGE_BUDGET).optional(),
    pageHeadline: z.string().max(200).optional(),
  })
  .strict()
  .refine(
    (b) => Boolean(b.prompts?.length) !== Boolean(b.features?.length),
    'stuur óf prompts (legacy) óf features (v2), niet beide',
  );

interface RouteParams {
  params: Promise<{ deliverableId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = await getServerSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    const { deliverableId } = await params;
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      select: { id: true },
    });
    if (!deliverable) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let body: z.infer<typeof requestSchema>;
    try {
      body = requestSchema.parse(JSON.parse(await request.text()));
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const stack = await assembleCanvasContext(deliverableId, workspaceId);
    const generateConfig = stack.visualBrief?.generate as { model?: string } | undefined;
    const modelId = generateConfig?.model
      ?? selectModelForStyle(stack.visualBrief?.styleDirection ?? null, {
        contentTypeId: stack.deliverableTypeId ?? null,
        hasTrainedLora: false,
      });

    // Brand-style anchors zodat de feature-beelden matchen met de merk-look.
    const { fetchBrandStyleAnchors, maxAnchorsForModel } = await import('@/lib/ai/brand-style-anchors');
    const anchors = await fetchBrandStyleAnchors(workspaceId);
    const referenceImageUrls = anchors.slice(0, maxAnchorsForModel(modelId)).map((a) => a.fileUrl);

    // v2: server-side prompt-bouw uit feature-copy + imageBriefs; legacy:
    // client-prompts verbatim (zonder brief-avoid/seed — deprecated).
    const built: BuiltFeaturePrompt[] = body.features
      ? buildFeatureVisualPrompts(
          body.features.slice(0, FEATURE_IMAGE_BUDGET),
          body.pageHeadline ?? '',
          { brand: stack.brand, brandTokens: stack.brandTokens },
        )
      : (body.prompts ?? []).slice(0, FEATURE_IMAGE_BUDGET).map((prompt, idx) => ({
          index: idx,
          prompt,
          avoid: null,
          seed: Math.floor(Math.random() * 2_147_483_647),
        }));

    const storage = getStorageProvider();
    const startMs = Date.now();
    // Per-index resultaat (behoudt volgorde); null bij falen.
    const generated = await Promise.all(
      built.map(async (slot, idx): Promise<{ url: string; prompt: string; index: number } | null> => {
        try {
          // Defaults bevatten anti-collage/triptiek; brandImageryDonts komen
          // gate-correct uit getBrandContext; brief.avoid → userNegations (R6/R7).
          const negativePrompt = buildNegativePrompt({
            brandImageryDonts: stack.brand?.brandImageryDonts ?? [],
            userNegations: slot.avoid ? [slot.avoid] : [],
          });
          const result = await generateFalImage(modelId, slot.prompt, {
            imageSize: 'landscape_4_3',
            numImages: 1,
            referenceImageUrls: referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
            negativePrompt,
            // Empirisch geverifieerd (scripts/experiments/test-nano-banana-seed.ts):
            // nano-banana-pro is deterministisch per seed — verschillende seeds
            // garanderen verschillende beelden binnen de set (R4).
            seed: slot.seed,
          });
          const hostedUrl = result.images?.[0]?.url;
          if (!hostedUrl) return null;
          const bytes = await fetchWithSizeLimit(hostedUrl, AI_IMAGE_SIZE_CAP);
          const upload = await storage.upload(bytes, {
            workspaceId,
            fileName: `feature-visual-${deliverableId}-${Date.now()}-${slot.index}.png`,
            contentType: 'image/png',
          });
          return { url: upload.url, prompt: slot.prompt, index: slot.index };
        } catch (err) {
          console.error(`[generate-feature-visuals] ${modelId} idx=${idx} failed:`, err instanceof Error ? err.message : err);
          return null;
        }
      }),
    );
    const elapsedMs = Date.now() - startMs;

    // Persist alleen op het v2-pad (legacy mist de feature-index-semantiek).
    // Fail-soft naar het generate-visual-patroon: een falende persist mag de
    // gegenereerde URLs nooit blokkeren (orphaned-files-les, gotchas 2026-06-08).
    if (body.features) {
      try {
        await prisma.$transaction(async (tx) => {
          for (const g of generated) {
            if (!g) continue;
            const variantGroup = `feature-visual:${g.index}`;
            await tx.deliverableComponent.deleteMany({ where: { deliverableId, variantGroup } });
            const baseOrder = await tx.deliverableComponent.count({ where: { deliverableId } });
            await tx.deliverableComponent.create({
              data: {
                deliverableId,
                componentType: 'image',
                groupType: 'variant',
                order: baseOrder,
                variantGroup,
                variantIndex: 0,
                isSelected: true,
                imageUrl: g.url,
                imageSource: 'ai_generated',
                imagePromptUsed: g.prompt,
                aiProvider: modelId.startsWith('openai/') ? 'openai' : 'fal',
                aiModel: modelId,
                generationDuration: elapsedMs,
                status: 'GENERATED',
                generatedAt: new Date(),
                iterationCount: 0,
              },
            });
          }
        });
        invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
      } catch (err) {
        console.error(
          '[generate-feature-visuals] component-persist faalde — URLs worden tóch geretourneerd:',
          err instanceof Error ? err.message : err,
        );
      }
    }

    // urls index-aligned met de request-volgorde (legacy contract intact);
    // sources geeft de herkomst per slot ('generated' | null) voor de UI.
    const urls = generated.map((g) => g?.url ?? null);
    const sources = generated.map((g) => (g ? ('generated' as const) : null));
    return NextResponse.json({ urls, sources });
  } catch (err) {
    console.error('[generate-feature-visuals] error:', err);
    return NextResponse.json({ error: 'Failed to generate feature visuals' }, { status: 500 });
  }
}
