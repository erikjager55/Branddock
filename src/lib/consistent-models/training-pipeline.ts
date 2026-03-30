// =============================================================
// Training Pipeline — Orchestrates Astria fine-tuning
//
// startTraining(modelId, workspaceId):
//   Validates model, uploads images to Astria, starts training.
//
// handleTrainingComplete(astriaModelId, success, error?):
//   Called by webhook/poller when training finishes.
//   Generates sample images on success.
// =============================================================

import { prisma } from '@/lib/prisma';
import { getR2SignedUrl } from '@/lib/storage/r2-storage';
import {
  createTune,
  createPrompt,
  type CreateTuneParams,
} from '@/lib/integrations/astria/astria-client';
import type { ConsistentModelType } from '@prisma/client';

// ─── Constants ──────────────────────────────────────────────

const TRIGGER_WORDS: Record<ConsistentModelType, string> = {
  PERSON: 'ohwx person',
  PRODUCT: 'ohwx product',
  STYLE: 'ohwx style',
  OBJECT: 'ohwx object',
};

const MIN_IMAGES: Record<ConsistentModelType, number> = {
  PERSON: 5,
  PRODUCT: 5,
  STYLE: 10,
  OBJECT: 5,
};

const DEFAULT_SAMPLE_PROMPTS: Record<ConsistentModelType, string> = {
  PERSON: 'A professional portrait photo of ohwx person, natural lighting, neutral background',
  PRODUCT: 'A clean product photo of ohwx product on a white background, studio lighting',
  STYLE: 'A photograph in the ohwx style, beautiful composition, high quality',
  OBJECT: 'A photo of ohwx object, clean background, professional lighting',
};

const NUM_SAMPLE_IMAGES = 3;

// ─── Types ──────────────────────────────────────────────────

export interface StartTrainingResult {
  astriaModelId: number;
  status: 'TRAINING';
}

export interface TrainingCompleteResult {
  success: boolean;
  modelId: string;
  sampleImageUrls?: string[];
  error?: string;
}

// ─── Start Training ─────────────────────────────────────────

/** Validate and start Astria fine-tuning for a ConsistentModel */
export async function startTraining(
  modelId: string,
  workspaceId: string,
  callbackUrl?: string
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

  const minRequired = MIN_IMAGES[model.type];
  if (model.referenceImages.length < minRequired) {
    throw new Error(
      `Need at least ${minRequired} reference images for ${model.type} models. Got ${model.referenceImages.length}.`
    );
  }

  // 2. Generate signed URLs for reference images
  const imageUrls = await Promise.all(
    model.referenceImages.map((img) => getR2SignedUrl(img.storageKey, 7200))
  );

  // 3. Determine trigger word and training params
  const triggerWord = TRIGGER_WORDS[model.type];
  const trainingConfig = (model.trainingConfig as Record<string, unknown>) ?? {};

  const tuneParams: CreateTuneParams = {
    title: `${model.name} — ${model.workspaceId}`,
    name: triggerWord.split(' ').pop() ?? 'subject',
    imageUrls,
    branch: 'flux1',
    modelType: 'lora',
    token: triggerWord.split(' ')[0] ?? 'ohwx',
    steps: (trainingConfig.steps as number) ?? undefined,
    callback: callbackUrl,
    faceCrop: model.type === 'PERSON',
    preset: model.type === 'PERSON' ? 'flux-lora-portrait' : null,
  };

  // 4. Create tune on Astria
  const tune = await createTune(tuneParams);

  // 5. Update model in DB
  await prisma.consistentModel.update({
    where: { id: modelId },
    data: {
      status: 'TRAINING',
      astriaModelId: String(tune.id),
      astriaModelUrl: tune.url ?? null,
      triggerWord,
      baseModel: 'flux-lora',
      trainingStartedAt: new Date(),
      trainingError: null,
      trainingConfig: {
        ...(trainingConfig as object),
        astriaBranch: 'flux1',
        astriaPreset: tuneParams.preset,
      },
    },
  });

  return {
    astriaModelId: tune.id,
    status: 'TRAINING',
  };
}

// ─── Handle Training Complete ───────────────────────────────

/** Called when Astria reports training is done (via webhook or polling) */
export async function handleTrainingComplete(
  astriaModelId: string,
  success: boolean,
  error?: string
): Promise<TrainingCompleteResult> {
  // 1. Find the model by Astria tune ID
  const model = await prisma.consistentModel.findFirst({
    where: { astriaModelId },
  });

  if (!model) {
    throw new Error(`No ConsistentModel found for Astria tune ID: ${astriaModelId}`);
  }

  if (!success) {
    // 2a. Training failed
    await prisma.consistentModel.update({
      where: { id: model.id },
      data: {
        status: 'TRAINING_FAILED',
        trainingError: error ?? 'Training failed — no details provided by Astria.',
      },
    });

    return {
      success: false,
      modelId: model.id,
      error: error ?? 'Training failed',
    };
  }

  // 2b. Training succeeded — generate sample images
  const sampleUrls: string[] = [];

  try {
    const samplePrompt = DEFAULT_SAMPLE_PROMPTS[model.type];
    const tuneId = parseInt(astriaModelId, 10);

    // Generate sample images in parallel
    const samplePromises = Array.from({ length: NUM_SAMPLE_IMAGES }, () =>
      createPrompt(tuneId, {
        text: samplePrompt,
        numImages: 1,
        aspectRatio: '1:1',
      })
    );

    const sampleResults = await Promise.all(samplePromises);

    for (const result of sampleResults) {
      if (result.images?.length > 0) {
        sampleUrls.push(result.images[0]);
      }
    }
  } catch (sampleError) {
    // Sample generation is non-critical — model is still READY
    console.error('Failed to generate sample images:', sampleError);
  }

  // 3. Update model to READY
  await prisma.consistentModel.update({
    where: { id: model.id },
    data: {
      status: 'READY',
      trainingCompletedAt: new Date(),
      trainingError: null,
      thumbnailUrl: sampleUrls[0] ?? null,
      sampleImageUrls: sampleUrls.length > 0 ? sampleUrls : undefined,
    },
  });

  return {
    success: true,
    modelId: model.id,
    sampleImageUrls: sampleUrls,
  };
}
