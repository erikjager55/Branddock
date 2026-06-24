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
import { buildAiErrorResponseInit } from '@/lib/ai/error-handler';
import { requireDeliverableAccess } from '@/lib/deliverable/deliverable-access';
import { prisma } from '@/lib/prisma';
import { withAiRateLimit } from '@/lib/ai/middleware';
import { assembleCanvasContext, type CanvasContextStack } from '@/lib/ai/canvas-context';
import { buildVisualBriefImagePrompts, selectModelForStyle } from '@/lib/ai/visual-brief-prompts';
import { getMultiCandidateDefault } from '@/features/campaigns/lib/deliverable-types';
import { scoreImageFidelity } from '@/lib/brand-fidelity/visual-fidelity-scorer';
import { generateFalImage } from '@/lib/integrations/fal/fal-client';
import { fetchWithSizeLimit, AI_IMAGE_SIZE_CAP } from '@/lib/security/fetch-with-limit';
import { getStorageProvider } from '@/lib/storage';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { parseLogoIntent, stripLogoMentions, type LogoPosition } from '@/lib/visual/logo-intent';
import { compositeLogoOverlay, sampleCornerLuminance, DARK_CORNER_LUMINANCE_THRESHOLD } from '@/lib/visual/logo-overlay';
import { getBrandLogo, getBrandLogos, pickLogoForBackground, type BrandLogo } from '@/lib/brand/get-brand-logo';
import { resolveHeroLogoOverlayEnabled } from '@/lib/landing-pages/hero-logo-config';
import { patchHeroVisualUrl } from '@/lib/deliverable/patch-hero-visual';
import { runHeroLogoGate } from '@/lib/landing-pages/hero-logo-gate';
import { ingestUploadsToLibrary } from '@/lib/media/ingest-uploads-to-library';
import { z } from 'zod';

const VISUAL_GROUP = 'visual';

/**
 * Resolve het variantGroup-label voor opslag. Workspace-level = 'visual'
 * (huidige flow). Scene-scoped (2026-05-19 Fase 1) = 'visual:<sceneId>'
 * (bv 'visual:hook') zodat per-scene variants los gepersisteerd worden
 * zonder Prisma-schema-migratie. Client-side hydration in CanvasPage
 * en VisualVariantsBlock leest dezelfde encoding.
 */
function resolveVisualGroup(sceneId: 'hook' | 'body' | 'cta' | undefined): string {
  return sceneId ? `${VISUAL_GROUP}:${sceneId}` : VISUAL_GROUP;
}

/**
 * The route auto-routes between FLUX.2 Pro / GPT Image 2 / Recraft V3
 * based on the chosen style chip — see selectModelForStyle() in
 * visual-brief-prompts.ts. Fallback when no chip is set is FLUX.2 Pro.
 */

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
    /**
     * Optional scene-scope (2026-05-19 Fase 1). Wanneer set, variants
     * worden gepersisteerd onder `settings.scenes[sceneId].imageVariants`
     * ipv top-level. Voor video-script types waar elke scene (hook/body/
     * cta) eigen visual heeft. Niet-set = workspace-level (huidige flow).
     */
    sceneId: z.enum(['hook', 'body', 'cta']).optional(),
    /**
     * Scene-specific visual direction. Wanneer `sceneId` set is, gebruikt
     * de route deze tekst als primaire subject-seed (briefingText) i.p.v.
     * de workspace-level Visual Brief. Bron: client parseert eerst
     * `sceneOverrides[sceneId].visualText` (user-edit in Step 2), valt
     * terug op de parsed `[VISUAL: …]` uit de scene-script. Geleverd
     * 2026-05-19 omdat scene-images anders generic uitkomen — workspace
     * brief is voor 1 visual, niet voor 3 verschillende scenes.
     */
    sceneVisualPrompt: z.string().max(1500).optional(),
    /**
     * Wanneer 'hero': de route bust de eerste geüploade URL ATOMISCH server-side
     * in de landing-page-puckData (BrandHero.heroVisualUrl) + structuredVariant.
     * Elimineert de client-race (self-heal/confirm-flow persistten dit voorheen
     * client-side, wat onbetrouwbaar bleek). Andere flows laten dit leeg.
     */
    target: z.enum(['hero']).optional(),
    /**
     * Alleen relevant bij target:'hero'. 'fill-only' schrijft de hero-URL
     * uitsluitend waar nog géén beeld staat — voor de async self-heal, zodat
     * een handmatige keuze (Puck image-field) tijdens de ~30s generatie niet
     * wordt overschreven. Default 'overwrite' (expliciete regenerate-flows).
     */
    heroWriteMode: z.enum(['fill-only', 'overwrite']).optional(),
  })
  .strict()
  // Contract afdwingen i.p.v. stil negeren: heroWriteMode zonder target:'hero'
  // is een caller-fout en hoort een 400 te geven (review-minor 2026-06-10).
  .refine((v) => !v.heroWriteMode || v.target === 'hero', {
    message: "heroWriteMode vereist target: 'hero'",
  })
  .or(z.undefined());

interface RouteParams {
  params: Promise<{ deliverableId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { deliverableId } = await params;

    // Resource-based auth: workspace van het deliverable, niet cookie-gelijkheid.
    // De hero self-heal vanuit een zombie-tab 404'de hier stil (audit
    // docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md).
    const access = await requireDeliverableAccess(deliverableId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const workspaceId = access.workspaceId;

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
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

    // 2026-05-19 — Scene-scoped generation: when sceneId is set, override
    // the briefingText with the scene-specific [VISUAL: …] direction so
    // each scene's image matches its own script-scene instead of the
    // workspace-level brief. Resolution order:
    //   1. Client-provided `sceneVisualPrompt` (covers user inline edits)
    //   2. Server-side: fetch the scene's DeliverableComponent, parse the
    //      first [VISUAL: …] block from its generatedContent
    //   3. Fall back to existing workspace briefingText (legacy behaviour)
    // Track logo overlay intent across the gen → upload pipeline. When
    // the scene asks for a logo and the workspace has one in its
    // styleguide, we strip the logo mention from the prompt (image-gen
    // hallucinates logos) and composite the real asset post-generation.
    let logoOverlay: { position: LogoPosition; logo: BrandLogo } | null = null;

    if (body?.sceneId) {
      let sceneVisualText = body?.sceneVisualPrompt?.trim();
      if (!sceneVisualText) {
        const sceneComponent = await prisma.deliverableComponent.findFirst({
          where: {
            deliverableId,
            variantGroup: body.sceneId,
            isSelected: true,
          },
          select: { generatedContent: true },
        }) ?? await prisma.deliverableComponent.findFirst({
          where: { deliverableId, variantGroup: body.sceneId },
          orderBy: { variantIndex: 'asc' },
          select: { generatedContent: true },
        });
        const raw = sceneComponent?.generatedContent ?? '';
        const match = raw.match(/\[\s*[Vv][Ii][Ss][Uu][Aa][Ll]\s*:\s*([^\]]+)\]/);
        sceneVisualText = match?.[1]?.trim();
      }
      if (sceneVisualText) {
        // 2026-05-19 — logo-overlay path. Parse intent BEFORE stripping
        // so position cue ("rechtsonder", "top-left", etc.) is preserved.
        const intent = parseLogoIntent(sceneVisualText);
        if (intent.wantLogo) {
          // ALWAYS strip logo mentions — even when we can't overlay (no
          // asset, in-scene placement) — because the image-model will
          // otherwise hallucinate a fake logo wherever the prompt asks.
          // Clean image > hallucinated mark.
          sceneVisualText = stripLogoMentions(sceneVisualText);

          if (intent.isInScenePlacement) {
            console.info(
              `[generate-visual] scene ${body.sceneId}: logo placement is in-scene (on screen/wall) — skipping corner overlay; stripped mention so model doesn't hallucinate`,
            );
          } else {
            const brandLogo = await getBrandLogo(workspaceId);
            if (brandLogo) {
              logoOverlay = { position: intent.position, logo: brandLogo };
            } else {
              console.warn(
                `[generate-visual] scene ${body.sceneId} asks for logo but workspace ${workspaceId} has no styleguide logo — skipping overlay (mention stripped from prompt)`,
              );
            }
          }
        }
        if (sceneVisualText) {
          stack.visualBrief = {
            ...stack.visualBrief,
            briefingText: sceneVisualText,
          };
        }
      }
    }

    // W5 logo L-Fase 3 (plan §5): opt-in hero-logo-overlay. Stempelt post-gen
    // het ÉCHTE merklogo op de hero (image-modellen hallucineren logo's; W0/L2
    // dringen ze terug, deze overlay levert het juiste logo wanneer de user dat
    // wil). Default top-right — vermijdt de hero-tekst (links/gecentreerd in
    // BrandHero). Per-variant luminantie-bewuste LIGHT/DARK-keuze gebeurt in de
    // upload-loop (elke variant kan een andere hoek-helderheid hebben). Los van
    // het scene-intent-pad hierboven (dat is video-scene-gedreven).
    let heroLogoOverlay: { logos: BrandLogo[]; position: LogoPosition } | null = null;
    if (body?.target === 'hero' && !logoOverlay) {
      const overlayEnabled = await resolveHeroLogoOverlayEnabled(workspaceId);
      if (overlayEnabled) {
        const logos = await getBrandLogos(workspaceId);
        if (logos.length > 0) {
          heroLogoOverlay = { logos, position: 'top-right' };
        } else {
          console.warn(
            `[generate-visual] hero-logo-overlay aan maar workspace ${workspaceId} heeft geen styleguide-logo — overslaan`,
          );
        }
      }
    }

    // Multi-candidate default per content-type (Pattern B image-quality-chain).
    // Expensive types (landing-page, explainer-video, social hero) krijgen 3
    // candidates voor head-to-head selectie; rest 2.
    const promptCount = body?.count
      ?? getMultiCandidateDefault(stack.deliverableTypeId ?? '');
    const { prompts, negativePrompt } = buildVisualBriefImagePrompts(
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

    // Auto-route to the best model for this chip. Honour an explicit
    // visualBrief.generate.model override when the user has picked one.
    // Pass contentTypeId so chip-less briefs on text-heavy content types
    // (search-ad, social-ad, linkedin-carousel, etc.) still route to a
    // text-rendering capable model — matching what Layer 1 promised in
    // the Step-1 banner. hasTrainedLora is explicitly false here: the
    // trained-style source has its own dedicated endpoint
    // (generate-visual-trained), so this endpoint never serves LoRA work.
    const generateConfig = visualBrief?.generate as { model?: string } | undefined;
    const modelId = generateConfig?.model
      ?? selectModelForStyle(stack.visualBrief?.styleDirection ?? null, {
        contentTypeId: stack.deliverableTypeId ?? null,
        hasTrainedLora: false,
      });

    // F40 (audit 2026-05-13): brand-style anchor references. Worden als
    // image_urls doorgegeven aan multi-ref modellen (Nano Banana, Recraft,
    // FLUX 2) zodat de output consistent matched met workspace brand-look.
    const { fetchBrandStyleAnchors, maxAnchorsForModel } = await import('@/lib/ai/brand-style-anchors');
    const anchors = await fetchBrandStyleAnchors(workspaceId);
    const anchorLimit = maxAnchorsForModel(modelId);
    const referenceImageUrls = anchors.slice(0, anchorLimit).map((a) => a.fileUrl);
    if (referenceImageUrls.length > 0) {
      console.log(
        `[generate-visual] using ${referenceImageUrls.length} brand-style anchors for ${modelId}`,
      );
    }

    // F42d (audit 2026-05-14): Recraft V3 heeft een structured `style` param
    // die OUTPUT-aard bepaalt. Zonder dit produceert het default photoreal,
    // óók wanneer prompt om illustration vraagt. Mapping styleDirection-chip
    // → Recraft style value:
    const chip = stack.visualBrief?.styleDirection ?? null;
    const recraftStyle: 'any' | 'digital_illustration' | 'vector_illustration' | 'realistic_image' | 'icon' | undefined =
      modelId === 'fal-ai/recraft-v3'
        ? chip === 'illustration'
          ? 'digital_illustration'
          : chip === 'infographic' || chip === 'data-driven'
            ? 'vector_illustration'
            : chip === 'quote-text'
              ? 'icon'
              : 'realistic_image'
        : undefined;
    if (recraftStyle) {
      console.log(`[generate-visual] recraft style=${recraftStyle} (chip=${chip})`);
    }

    const startMs = Date.now();
    const generated = await Promise.all(
      finalPrompts.map(async (prompt) => {
        try {
          const result = await generateFalImage(modelId, prompt, {
            imageSize: falImageSize,
            numImages: 1,
            referenceImageUrls: referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
            recraftStyle,
            negativePrompt: negativePrompt || undefined,
          });
          const url = result.images?.[0]?.url;
          if (!url) return null;
          return { prompt, hostedUrl: url };
        } catch (err) {
          console.error(`[generate-visual] ${modelId} call failed:`, err instanceof Error ? err.message : err);
          return null;
        }
      }),
    );

    const successful = generated.filter((r): r is NonNullable<typeof r> => r !== null);
    if (successful.length === 0) {
      return NextResponse.json(
        { error: `All image generation calls failed (model: ${modelId}). Check that FAL_KEY is configured.` },
        { status: 502 },
      );
    }

    // Download from fal.ai's hosted URL (signed, expires) and upload to
    // our storage so the URL remains stable for downstream usage.
    // When a logo overlay is requested, composite the brand-logo asset
    // onto each generated image before upload — image models hallucinate
    // logos, so we keep them out of the prompt and stamp the real mark
    // on post-gen. Per-image try/catch so an overlay failure falls back
    // to the raw image instead of failing the whole request.
    const storage = getStorageProvider();
    // Per-item try/catch (geen kale Promise.all): faalt één download/upload, dan
    // mag dat de andere — al geüploade — varianten NIET orphanen + de hele
    // request 500'en. We persisten/retourneren de geslaagde uploads.
    const uploadResults = await Promise.all(
      successful.map(async (img, idx) => {
        try {
          const rawBytes = await fetchWithSizeLimit(img.hostedUrl, AI_IMAGE_SIZE_CAP);
          let bytes: Buffer = rawBytes;
          if (logoOverlay) {
            try {
              bytes = await compositeLogoOverlay({
                imageUrl: img.hostedUrl,
                logoUrl: logoOverlay.logo.url,
                logoFileType: logoOverlay.logo.fileType,
                position: logoOverlay.position,
              });
            } catch (err) {
              console.warn(
                `[generate-visual] logo overlay failed for variant ${idx}, uploading raw image:`,
                err instanceof Error ? err.message : err,
              );
              bytes = rawBytes;
            }
          } else if (heroLogoOverlay) {
            // W5 L-Fase 3: per-variant luminantie-bewuste hero-overlay. Sample
            // de hoek uit de al-opgehaalde rawBytes (geen tweede fetch) → kies
            // LIGHT/DARK-logovariant → composite. Faalt het, dan het rauwe beeld
            // (een ontbrekend logo is beter dan een 500 of een leeg vlak).
            try {
              const luminance = await sampleCornerLuminance(rawBytes, heroLogoOverlay.position);
              const logo = pickLogoForBackground(
                heroLogoOverlay.logos,
                luminance < DARK_CORNER_LUMINANCE_THRESHOLD,
              );
              if (logo) {
                bytes = await compositeLogoOverlay({
                  imageBuffer: rawBytes,
                  logoUrl: logo.url,
                  logoFileType: logo.fileType,
                  position: heroLogoOverlay.position,
                });
              }
            } catch (err) {
              console.warn(
                `[generate-visual] hero-logo overlay failed for variant ${idx}, uploading raw image:`,
                err instanceof Error ? err.message : err,
              );
              bytes = rawBytes;
            }
          }
          const fileName = `canvas-visual-${deliverableId}-${Date.now()}-${idx}.png`;
          const upload = await storage.upload(bytes, {
            workspaceId,
            fileName,
            contentType: 'image/png',
          });
          return { url: upload.url, prompt: img.prompt, fileSize: bytes.length };
        } catch (err) {
          console.error(
            `[generate-visual] download/upload failed for variant ${idx}:`,
            err instanceof Error ? err.message : err,
          );
          return null;
        }
      }),
    );
    const uploads = uploadResults.filter((u): u is NonNullable<typeof u> => u !== null);
    if (uploads.length === 0) {
      return NextResponse.json(
        { error: 'All image uploads failed after generation.' },
        { status: 502 },
      );
    }

    // Server-side hero-wiring (atomisch): bust de eerste geüploade URL direct in
    // de landing-page-puckData (BrandHero) + structuredVariant. Voorheen deed de
    // client dit (confirm-flow/self-heal) — onbetrouwbaar door een race + stale
    // HMR, waardoor de header-image leeg bleef ondanks geslaagde generatie. De
    // server is de enige autoriteit op de DB → dit landt gegarandeerd. Gedeelde
    // helper (ook gebruikt door -compose / -trained), best-effort + idempotent.
    if (body?.target === 'hero' && uploads[0]?.url) {
      await patchHeroVisualUrl(deliverableId, uploads[0].url, {
        onlyIfEmpty: body?.heroWriteMode === 'fill-only',
      });
    }

    // Persist as DeliverableComponent variantGroup='visual' of
    // 'visual:<sceneId>'. Replace any existing visual variants in dezelfde
    // group — workspace-level vs scene-scoped staan los van elkaar.
    const elapsedMs = Date.now() - startMs;
    const variantGroup = resolveVisualGroup(body?.sceneId);
    // Persist-failure mag de hero NIET blokkeren: de client zet de hero-URL uit
    // de respons (variants[0].url). Faalt de DB-transactie (transient/connectie),
    // dan retourneren we tóch de geüploade URLs (zonder DB-id) zodat het beeld
    // alsnog landt — i.p.v. een 500 die de pagina beeldloos laat (root-cause-klasse
    // van de orphaned-files: upload lukte, persist faalde, hero bleef leeg).
    let components: Array<{ id: string; url: string; prompt: string }>;
    try {
      components = await prisma.$transaction(async (tx) => {
        await tx.deliverableComponent.deleteMany({
          where: { deliverableId, variantGroup },
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
              variantGroup,
              variantIndex: i,
              isSelected: i === 0,
              imageUrl: u.url,
              imageSource: 'ai_generated',
              imagePromptUsed: u.prompt,
              aiProvider: modelId.startsWith('openai/') ? 'openai' : 'fal',
              aiModel: modelId,
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
    } catch (err) {
      console.error(
        '[generate-visual] variant-persist transactie faalde — retourneer geüploade URLs zonder DB-id:',
        err instanceof Error ? err.message : err,
      );
      components = uploads.map((u) => ({ id: '', url: u.url, prompt: u.prompt }));
    }

    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));

    // Library-groei (#325-patroon): elk AI-gegenereerd beeld als MediaAsset
    // zodat het herbruikbaar wordt via library-first matching. Iteratie over
    // `uploads` (niet de persist-rijen) zodat de byte-lengte altijd klopt —
    // ook wanneer de DB-transactie hierboven fail-soft viel. Fire-and-forget.
    const briefingText =
      typeof visualBrief?.briefingText === 'string' ? visualBrief.briefingText.trim() : '';
    ingestUploadsToLibrary(uploads, {
      workspaceId,
      uploadedById: access.userId,
      deliverableTypeId: stack.deliverableTypeId,
      name: briefingText || undefined,
      defaultContentType: 'image/png',
    });

    // Pattern B parity (image-quality-chain): auto-trigger fidelity scoring
    // voor elke gegenereerde variant. Was tot 2026-05-15 alleen op -compose
    // en -trained routes; vandaag aangevuld voor lifestyle-flow. Fire-and-
    // forget (~$0.04 + 12-15s per call); de UI haalt scores binnen via de
    // bestaande components-query refetch.
    // W5 logo L-Fase 2 (plan §5): ná de scoring draait op het hero-pad de
    // logo-gate in dezelfde continuation — logo-fidelity < 50 op de actieve
    // hero → auto-deselect naar een schone zustervariant. Geen latency op de
    // respons; race-guard in de gate (alleen wisselen zolang de hero één van
    // déze varianten is).
    const scorable = components.filter((c) => c.id); // persist-fallback (id='') heeft geen DB-row om te scoren
    void Promise.allSettled(
      scorable.map((c) => scoreImageFidelity({ componentId: c.id, workspaceId })),
    )
      .then(() => {
        if (body?.target === 'hero' && scorable.length > 1) {
          return runHeroLogoGate({
            deliverableId,
            workspaceId,
            variants: scorable.map((c) => ({ componentId: c.id, url: c.url })),
          });
        }
        return null;
      })
      .catch(() => {
        /* individual failures worden binnen scoreImageFidelity/runHeroLogoGate gelogd */
      });

    return NextResponse.json({
      variants: components,
      provider: modelId.startsWith('openai/') ? 'openai' : 'fal',
      model: modelId,
      aspectRatio: aspectLabel,
      generationDuration: elapsedMs,
      // 2026-05-19 Fase 1: echo sceneId terug zodat client kan routen
      // naar sceneImageVariants[sceneId] ipv workspace-level state.
      sceneId: body?.sceneId ?? null,
    });
  } catch (err) {
    console.error('[generate-visual] error:', err);
    const { body, status } = buildAiErrorResponseInit(err);
    return NextResponse.json(body, { status });
  }
}
