// =============================================================
// Training Pipeline — Orchestrates fal.ai LoRA fine-tuning
//
// startTraining(modelId, workspaceId):
//   Validates model, zips reference images, uploads to fal.ai,
//   and starts training.
//
// handleTrainingComplete(falRequestId, success, error?, loraUrl?):
//   Called by poller when training finishes.
//   Generates sample images on success.
// =============================================================

import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import {
  uploadTrainingImages,
  startFalTraining,
  runFalGeneration,
} from '@/lib/integrations/fal/fal-client';
import { getStorageProvider } from '@/lib/storage';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { TRIGGER_WORDS, MIN_IMAGES_BY_TYPE, FAL_MODEL_CONFIG, LORA_QUALITY_CONFIG, TRAINING_STEPS_BY_TYPE } from '@/features/consistent-models/constants/model-constants';
import type { ConsistentModelType } from '@prisma/client';

// ─── Constants ──────────────────────────────────────────────

const SHARED_STUDIO_SUFFIX = 'clean neutral gray seamless studio background, soft directional studio lighting, high-end brand photography, shot on medium format camera, 8K detail';

/** Build PERSON showcase prompts (1 hero + 5 strip) using brand context.
 * Each prompt starts with the trigger word for maximum LoRA activation. */
function buildPersonShowcasePrompts(triggerWord: string, brandStyle: string, colorDirection: string): string[] {
  const tw = triggerWord || 'TOK person';
  const clothing = `wearing ${brandStyle} clothing in ${colorDirection} tones`;
  return [
    // Hero — close-up portrait (landscape)
    `A photo of ${tw}, high-end studio portrait, extreme close-up from chest up, facing slightly to the left, neutral relaxed expression, visible skin texture and pores, sharp catchlights in the eyes, shallow depth of field, ${clothing}, ${SHARED_STUDIO_SUFFIX}, 85mm lens`,
    // 1. Full body front
    `A photo of ${tw}, full body studio portrait standing straight facing camera, relaxed confident posture, hands at sides, ${clothing}, ${SHARED_STUDIO_SUFFIX}, full length shot`,
    // 2. Full body side profile
    `A photo of ${tw}, full body side profile standing on a minimal platform, looking straight ahead, ${clothing}, ${SHARED_STUDIO_SUFFIX}, editorial brand photography, full length shot`,
    // 3. Half body — arms crossed
    `A photo of ${tw}, half body portrait from waist up, arms gently crossed, warm genuine smile, ${clothing}, ${SHARED_STUDIO_SUFFIX}, shot at 70mm`,
    // 4. Full body back view
    `A photo of ${tw}, full body rear view standing with weight slightly on one leg, looking slightly over the right shoulder, ${clothing}, ${SHARED_STUDIO_SUFFIX}, full length shot`,
    // 5. Full body three-quarter
    `A photo of ${tw}, full body three-quarter angle in a relaxed standing pose, one hand in pocket, soft smile, ${clothing}, ${SHARED_STUDIO_SUFFIX}, lifestyle brand photography, full length shot`,
  ];
}

/** Extract brand style and color direction from model's brand context */
function extractBrandStyling(brandContext: Record<string, unknown> | null): { brandStyle: string; colorDirection: string } {
  if (!brandContext) {
    return { brandStyle: 'modern professional', colorDirection: 'neutral charcoal and white' };
  }

  // Brand style from personality or tone
  const personality = (brandContext.brandPersonality as string) ?? '';
  const tone = (brandContext.toneOfVoice as string) ?? '';
  const style = (brandContext.brandStyle as string) ?? '';
  const combined = [personality, tone, style].filter(Boolean).join(', ');
  const brandStyle = combined
    ? combined.slice(0, 80) // Keep it concise for the prompt
    : 'modern professional';

  // Color direction from brand colors
  const colors = (brandContext.brandColors as Array<{ name: string; hex: string }>) ?? [];
  const colorDirection = colors.length > 0
    ? colors.slice(0, 3).map((c) => c.name || c.hex).join(' and ')
    : 'neutral charcoal and white';

  return { brandStyle, colorDirection };
}

/** Default single-prompt fallback for non-PERSON types.
 * Each uses the type-appropriate prefix matching LORA_QUALITY_CONFIG.triggerPrefix */
const DEFAULT_SAMPLE_PROMPTS: Record<ConsistentModelType, string> = {
  PERSON: '', // Uses buildPersonShowcasePrompts instead
  PRODUCT: 'A product photo of TOK product, clean white background, professional studio lighting, sharp detail, commercial photography',
  STYLE: 'An image in the style of TOK style, beautiful composition, high quality, detailed',
  OBJECT: 'A photo of TOK object, clean background, professional studio lighting, sharp detail',
  BRAND_STYLE: 'A brand visual in the style of TOK brand_style, professional quality, brand consistent design, high detail',
  PHOTOGRAPHY: 'A photograph in the style of TOK photography, beautiful composition, professional lighting, sharp detail, high quality',
  ILLUSTRATION: 'An illustration in the style of TOK illustration, high quality, detailed artwork, clean lines, vibrant',
  VOICE: '',
  SOUND_EFFECT: '',
};

const NUM_SAMPLE_IMAGES_DEFAULT = 3;
const NUM_PERSON_SHOWCASE_IMAGES = 6;

// ─── Types ──────────────────────────────────────────────────

export interface StartTrainingResult {
  falRequestId: string;
  status: 'TRAINING';
}

export interface TrainingCompleteResult {
  success: boolean;
  modelId: string;
  sampleImageUrls?: string[];
  error?: string;
}

// ─── Start Training ─────────────────────────────────────────

/** Validate and start fal.ai LoRA fine-tuning for a ConsistentModel */
export async function startTraining(
  modelId: string,
  workspaceId: string
): Promise<StartTrainingResult> {
  // 1. Fetch model with reference images
  const model = await prisma.consistentModel.findFirst({
    where: { id: modelId, workspaceId },
    include: {
      referenceImages: {
        where: { isTrainingImage: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!model) {
    throw new Error('Model not found');
  }

  if (model.status !== 'DRAFT' && model.status !== 'TRAINING_FAILED') {
    throw new Error(
      `Cannot start training: model status is ${model.status}. Must be DRAFT or TRAINING_FAILED.`
    );
  }

  const minRequired = MIN_IMAGES_BY_TYPE[model.type];
  if (model.referenceImages.length < minRequired) {
    throw new Error(
      `Need at least ${minRequired} reference images for ${model.type} models. Got ${model.referenceImages.length}.`
    );
  }

  // 2. Create zip archive of reference images
  console.log('[training-pipeline] Step 2: Creating zip of', model.referenceImages.length, 'images');
  const zip = new JSZip();

  for (const img of model.referenceImages) {
    let fileBuffer: Buffer;

    if (img.storageUrl.startsWith('http://') || img.storageUrl.startsWith('https://')) {
      // Remote URL (e.g. AI-generated images stored in R2/cloud)
      console.log('[training-pipeline]   Downloading:', img.storageUrl.slice(0, 80));
      const resp = await fetch(img.storageUrl);
      if (!resp.ok) {
        console.error(`[training-pipeline]   Failed to download image ${img.fileName}: ${resp.status}`);
        continue;
      }
      fileBuffer = Buffer.from(await resp.arrayBuffer());
    } else {
      // Local file path
      const localPath = path.join('public', img.storageUrl.replace(/^\//, ''));
      console.log('[training-pipeline]   Reading:', localPath);
      fileBuffer = await readFile(localPath);
    }

    zip.file(img.fileName, fileBuffer);
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  console.log('[training-pipeline] Zip created:', (zipBuffer.length / 1024 / 1024).toFixed(2), 'MB');

  // 3. Upload zip to fal.ai storage
  const slugSafe = model.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 50);
  console.log('[training-pipeline] Step 3: Uploading zip to fal.ai storage...');
  const imageUrl = await uploadTrainingImages(
    zipBuffer,
    `${slugSafe}-training-images.zip`
  );
  console.log('[training-pipeline] Upload complete. Image URL:', imageUrl);

  // 4. Determine trigger word, trainer/generator per type, and training params
  const triggerWord = TRIGGER_WORDS[model.type];
  const falConfig = FAL_MODEL_CONFIG[model.type];
  const trainingConfig = (model.trainingConfig as Record<string, unknown>) ?? {};
  console.log('[training-pipeline] Step 4: Trigger word:', triggerWord || 'TOK', '| Trainer:', falConfig.label, '| Config:', JSON.stringify(trainingConfig));

  // 5. Start training on fal.ai with type-specific trainer
  // For ILLUSTRATION models with a style profile, inject the style caption suffix
  // so that autocaptioned training images include style descriptors
  let autocaptionPrefix: string | undefined;
  if (model.type === 'ILLUSTRATION' && model.styleProfile) {
    const profile = model.styleProfile as Record<string, unknown>;
    const generatedPrompts = profile.generatedPrompts as { trainingCaptionSuffix?: string } | undefined;
    if (generatedPrompts?.trainingCaptionSuffix) {
      autocaptionPrefix = `${triggerWord || 'TOK illustration'}, ${generatedPrompts.trainingCaptionSuffix}`;
      console.log('[training-pipeline] ILLUSTRATION caption prefix:', autocaptionPrefix);
    }
  }

  console.log('[training-pipeline] Step 5: Starting fal.ai training with', falConfig.trainer, '...');
  const defaultSteps = TRAINING_STEPS_BY_TYPE[model.type] ?? 500;
  const { requestId } = await startFalTraining(imageUrl, {
    steps: (trainingConfig.steps as number) ?? defaultSteps,
    learningRate: (trainingConfig.learningRate as number) ?? undefined,
    resolution: (trainingConfig.resolution as number) ?? undefined,
    triggerWord: triggerWord || 'TOK',
    autocaption: true,
    autocaptionPrefix,
  }, falConfig.trainer);
  console.log('[training-pipeline] Training started! Request ID:', requestId);

  // 6. Update model in DB — store trainer+generator for polling and generation
  await prisma.consistentModel.update({
    where: { id: modelId },
    data: {
      status: 'TRAINING',
      falModelId: falConfig.trainer,
      falLoraUrl: null,
      falRequestId: requestId,
      generatorEndpoint: falConfig.generator,
      triggerWord: triggerWord || 'TOK',
      baseModel: falConfig.trainer.includes('flux-2') ? 'flux-2' : 'flux-lora',
      trainingStartedAt: new Date(),
      trainingError: null,
      trainingConfig: {
        ...(trainingConfig as object),
        falTrainer: falConfig.trainer,
        falGenerator: falConfig.generator,
      },
    },
  });

  invalidateCache(cacheKeys.prefixes.consistentModels(workspaceId));

  return {
    falRequestId: requestId,
    status: 'TRAINING',
  };
}

// ─── Handle Training Complete ───────────────────────────────

/** Called by poller when fal.ai reports training is done */
export async function handleTrainingComplete(
  falRequestId: string,
  success: boolean,
  error?: string,
  loraUrl?: string
): Promise<TrainingCompleteResult> {
  // 1. Find the model by fal.ai request ID
  const model = await prisma.consistentModel.findFirst({
    where: { falRequestId },
  });

  if (!model) {
    throw new Error(`No ConsistentModel found for fal.ai request ID: ${falRequestId}`);
  }

  if (!success) {
    // 2a. Training failed
    await prisma.consistentModel.update({
      where: { id: model.id },
      data: {
        status: 'TRAINING_FAILED',
        trainingError: error ?? 'Training failed — no details provided by fal.ai.',
      },
    });

    invalidateCache(cacheKeys.prefixes.consistentModels(model.workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(model.workspaceId));

    return {
      success: false,
      modelId: model.id,
      error: error ?? 'Training failed',
    };
  }

  // 2b. Training succeeded — store LoRA URL and generate sample images
  const loraToUse = loraUrl ?? model.falLoraUrl;

  if (loraToUse) {
    await prisma.consistentModel.update({
      where: { id: model.id },
      data: { falLoraUrl: loraToUse },
    });
  }

  const sampleUrls: string[] = [];

  if (loraToUse) {
    try {
      const generatorEndpoint = model.generatorEndpoint ?? 'fal-ai/flux-lora';
      const storage = getStorageProvider();

      if (model.type === 'PERSON') {
        // PERSON: 6 diverse showcase images with brand-aware styling
        const brandContext = model.brandContext as Record<string, unknown> | null;
        const { brandStyle, colorDirection } = extractBrandStyling(brandContext);
        const prompts = buildPersonShowcasePrompts(model.triggerWord ?? 'TOK person', brandStyle, colorDirection);

        console.log('[training-pipeline] Generating', prompts.length, 'PERSON showcase images with brand style:', brandStyle, '| colors:', colorDirection);

        const qualityConfig = LORA_QUALITY_CONFIG[model.type];

        // Generate one image per prompt (each is a unique pose/angle)
        for (const prompt of prompts) {
          try {
            const result = await runFalGeneration(generatorEndpoint, {
              prompt,
              loras: [{ path: loraToUse, scale: qualityConfig.loraScale }],
              num_images: 1,
              num_inference_steps: qualityConfig.inferenceSteps,
              guidance_scale: qualityConfig.guidanceScale,
              output_format: 'png',
              ...(qualityConfig.negativePrompt ? { negative_prompt: qualityConfig.negativePrompt } : {}),
            });

            if (result.images?.[0]) {
              const response = await fetch(result.images[0].url);
              if (!response.ok) continue;
              const buffer = Buffer.from(await response.arrayBuffer());
              const uploaded = await storage.upload(buffer, {
                workspaceId: model.workspaceId,
                fileName: `sample-${Date.now()}-${sampleUrls.length}.png`,
                contentType: 'image/png',
              });
              sampleUrls.push(uploaded.url);
            }
          } catch (promptError) {
            console.error('[training-pipeline] Failed to generate showcase image:', promptError);
          }
        }
      } else if (model.type === 'ILLUSTRATION' && model.styleProfile) {
        // ILLUSTRATION with style profile: diverse samples using analyzed style
        const profile = model.styleProfile as Record<string, unknown>;
        const generatedPrompts = profile.generatedPrompts as { stylePrompt?: string; negativePrompt?: string } | undefined;
        const stylePrompt = generatedPrompts?.stylePrompt ?? '';
        const styleNegative = generatedPrompts?.negativePrompt ?? '';
        const qualityConfig = LORA_QUALITY_CONFIG[model.type];
        const triggerWord = model.triggerWord ?? 'TOK illustration';

        const illustrationSamplePrompts = [
          `${triggerWord}, illustration of two people collaborating in an office, ${stylePrompt}`,
          `${triggerWord}, illustration of a person using a laptop, modern workspace, ${stylePrompt}`,
          `${triggerWord}, abstract concept illustration showing growth and innovation, ${stylePrompt}`,
          `${triggerWord}, illustration of a customer service interaction, friendly mood, ${stylePrompt}`,
          `${triggerWord}, hero illustration for a product feature, wide composition, ${stylePrompt}`,
          `${triggerWord}, spot illustration of a lightbulb idea concept, iconic, ${stylePrompt}`,
        ];

        console.log('[training-pipeline] Generating', illustrationSamplePrompts.length, 'ILLUSTRATION showcase images with style profile');

        for (const prompt of illustrationSamplePrompts) {
          try {
            const result = await runFalGeneration(generatorEndpoint, {
              prompt,
              loras: [{ path: loraToUse, scale: qualityConfig.loraScale }],
              num_images: 1,
              num_inference_steps: qualityConfig.inferenceSteps,
              guidance_scale: qualityConfig.guidanceScale,
              output_format: 'png',
              ...(styleNegative ? { negative_prompt: `${qualityConfig.negativePrompt}, ${styleNegative}` } : { negative_prompt: qualityConfig.negativePrompt }),
            });

            if (result.images?.[0]) {
              const response = await fetch(result.images[0].url);
              if (!response.ok) continue;
              const buffer = Buffer.from(await response.arrayBuffer());
              const uploaded = await storage.upload(buffer, {
                workspaceId: model.workspaceId,
                fileName: `sample-${Date.now()}-${sampleUrls.length}.png`,
                contentType: 'image/png',
              });
              sampleUrls.push(uploaded.url);
            }
          } catch (promptError) {
            console.error('[training-pipeline] Failed to generate illustration showcase image:', promptError);
          }
        }
      } else {
        // Non-PERSON types (without style profile): 3 identical samples with default prompt
        const samplePrompt = DEFAULT_SAMPLE_PROMPTS[model.type];
        const qualityConfig = LORA_QUALITY_CONFIG[model.type];
        if (samplePrompt) {
          const result = await runFalGeneration(generatorEndpoint, {
            prompt: samplePrompt,
            loras: [{ path: loraToUse, scale: qualityConfig.loraScale }],
            num_images: NUM_SAMPLE_IMAGES_DEFAULT,
            num_inference_steps: qualityConfig.inferenceSteps,
            guidance_scale: qualityConfig.guidanceScale,
            output_format: 'png',
            ...(qualityConfig.negativePrompt ? { negative_prompt: qualityConfig.negativePrompt } : {}),
          });

          if (result.images && result.images.length > 0) {
            for (const image of result.images) {
              try {
                const response = await fetch(image.url);
                if (!response.ok) continue;
                const buffer = Buffer.from(await response.arrayBuffer());
                const uploaded = await storage.upload(buffer, {
                  workspaceId: model.workspaceId,
                  fileName: `sample-${Date.now()}.png`,
                  contentType: 'image/png',
                });
                sampleUrls.push(uploaded.url);
              } catch (downloadError) {
                console.error('Failed to download sample image:', downloadError);
              }
            }
          }
        }
      }
    } catch (sampleError) {
      // Sample generation is non-critical — model is still READY
      console.error('Failed to generate sample images:', sampleError);
    }
  }

  // 3. Update model to READY
  await prisma.consistentModel.update({
    where: { id: model.id },
    data: {
      status: 'READY',
      trainingCompletedAt: new Date(),
      trainingError: null,
      falLoraUrl: loraToUse,
      thumbnailUrl: sampleUrls[0] ?? null,
      sampleImageUrls: sampleUrls.length > 0 ? sampleUrls : undefined,
    },
  });

  invalidateCache(cacheKeys.prefixes.consistentModels(model.workspaceId));
  invalidateCache(cacheKeys.prefixes.dashboard(model.workspaceId));

  return {
    success: true,
    modelId: model.id,
    sampleImageUrls: sampleUrls,
  };
}
