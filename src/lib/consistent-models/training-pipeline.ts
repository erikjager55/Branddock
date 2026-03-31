// =============================================================
// Training Pipeline — Orchestrates Replicate LoRA fine-tuning
//
// startTraining(modelId, workspaceId):
//   Validates model, zips reference images, uploads to Replicate,
//   creates a model, and starts training.
//
// handleTrainingComplete(replicateTrainingId, success, error?, modelVersion?):
//   Called by webhook/poller when training finishes.
//   Generates sample images on success.
// =============================================================

import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import {
  createReplicateModel,
  uploadTrainingFile,
  startReplicateTraining,
  runReplicatePrediction,
} from '@/lib/integrations/replicate/replicate-client';
import { getStorageProvider } from '@/lib/storage';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { TRIGGER_WORDS, MIN_IMAGES_BY_TYPE } from '@/features/consistent-models/constants/model-constants';
import type { ConsistentModelType } from '@prisma/client';
import type { ModelBrandContext } from '@/features/consistent-models/types/consistent-model.types';

// ─── Constants ──────────────────────────────────────────────

const DEFAULT_SAMPLE_PROMPTS: Record<ConsistentModelType, string> = {
  PERSON: 'A professional portrait photo of TOK person, natural lighting, neutral background',
  PRODUCT: 'A clean product photo of TOK product on a white background, studio lighting',
  STYLE: 'A photograph in the TOK style, beautiful composition, high quality',
  OBJECT: 'A photo of TOK object, clean background, professional lighting',
  BRAND_STYLE: '',
  PHOTOGRAPHY: '',
  ILLUSTRATION: '',
  VOICE: '',
  SOUND_EFFECT: '',
};

const NUM_SAMPLE_IMAGES = 3;

// ─── Types ──────────────────────────────────────────────────

export interface StartTrainingResult {
  replicateTrainingId: string;
  status: 'TRAINING';
}

export interface TrainingCompleteResult {
  success: boolean;
  modelId: string;
  sampleImageUrls?: string[];
  error?: string;
}

// ─── Start Training ─────────────────────────────────────────

/** Validate and start Replicate LoRA fine-tuning for a ConsistentModel */
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

  const minRequired = MIN_IMAGES_BY_TYPE[model.type];
  if (model.referenceImages.length < minRequired) {
    throw new Error(
      `Need at least ${minRequired} reference images for ${model.type} models. Got ${model.referenceImages.length}.`
    );
  }

  // 2. Create zip archive of reference images
  const zip = new JSZip();

  for (const img of model.referenceImages) {
    // Reference images are stored via local storage provider
    // storageUrl is a local path like /uploads/media/ws_xxx/2026/03/file.jpg
    const localPath = path.join('public', img.storageUrl.replace(/^\//, ''));
    const fileBuffer = await readFile(localPath);
    zip.file(img.fileName, fileBuffer);
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

  // 3. Upload zip to Replicate via Files API
  const slugSafe = model.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 50);
  const uploadResult = await uploadTrainingFile(
    zipBuffer,
    `${slugSafe}-training-images.zip`
  );

  // 4. Create model on Replicate (idempotent — handles "already exists")
  const replicateModel = await createReplicateModel(
    slugSafe,
    `Branddock fine-tuned model: ${model.name}`
  );

  // 5. Determine trigger word and training params
  const triggerWord = TRIGGER_WORDS[model.type];
  const trainingConfig = (model.trainingConfig as Record<string, unknown>) ?? {};

  // 6. Start training on Replicate
  const training = await startReplicateTraining(
    replicateModel.owner,
    replicateModel.name,
    uploadResult.urls.get,
    {
      steps: (trainingConfig.steps as number) ?? undefined,
      learningRate: (trainingConfig.learningRate as number) ?? undefined,
      resolution: (trainingConfig.resolution as number) ?? undefined,
      triggerWord: triggerWord || 'TOK',
      autocaption: true,
    },
    callbackUrl
  );

  // 7. Update model in DB
  await prisma.consistentModel.update({
    where: { id: modelId },
    data: {
      status: 'TRAINING',
      replicateModelId: `${replicateModel.owner}/${replicateModel.name}`,
      replicateModelVersion: null,
      replicateTrainingId: training.id,
      triggerWord: triggerWord || 'TOK',
      baseModel: 'flux-lora',
      trainingStartedAt: new Date(),
      trainingError: null,
      trainingConfig: {
        ...(trainingConfig as object),
        replicateTrainer: 'ostris/flux-dev-lora-trainer',
      },
    },
  });

  invalidateCache(cacheKeys.prefixes.consistentModels(workspaceId));

  return {
    replicateTrainingId: training.id,
    status: 'TRAINING',
  };
}

// ─── Handle Training Complete ───────────────────────────────

/** Called when Replicate reports training is done (via webhook or polling) */
export async function handleTrainingComplete(
  replicateTrainingId: string,
  success: boolean,
  error?: string,
  modelVersion?: string
): Promise<TrainingCompleteResult> {
  // 1. Find the model by Replicate training ID
  const model = await prisma.consistentModel.findFirst({
    where: { replicateTrainingId },
  });

  if (!model) {
    throw new Error(`No ConsistentModel found for Replicate training ID: ${replicateTrainingId}`);
  }

  if (!success) {
    // 2a. Training failed
    await prisma.consistentModel.update({
      where: { id: model.id },
      data: {
        status: 'TRAINING_FAILED',
        trainingError: error ?? 'Training failed — no details provided by Replicate.',
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

  // 2b. Training succeeded — store version and generate sample images
  if (modelVersion) {
    await prisma.consistentModel.update({
      where: { id: model.id },
      data: { replicateModelVersion: modelVersion },
    });
  }

  const sampleUrls: string[] = [];
  const versionToUse = modelVersion ?? model.replicateModelVersion;

  if (versionToUse) {
    try {
      let samplePrompt = DEFAULT_SAMPLE_PROMPTS[model.type];
      if (samplePrompt) {
        // Enrich sample prompt with brand context if available
        const brandContext = model.brandContext as ModelBrandContext | null;
        if (brandContext?.contextSummary) {
          samplePrompt = `${samplePrompt}. Brand context: ${brandContext.contextSummary}`;
        }

        const prediction = await runReplicatePrediction(versionToUse, {
          prompt: samplePrompt,
          num_outputs: NUM_SAMPLE_IMAGES,
          output_format: 'png',
        });

        if (prediction.output && prediction.output.length > 0) {
          const storage = getStorageProvider();

          for (const imageUrl of prediction.output) {
            try {
              const response = await fetch(imageUrl);
              if (!response.ok) continue;
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);

              const result = await storage.upload(buffer, {
                workspaceId: model.workspaceId,
                fileName: `sample-${Date.now()}.png`,
                contentType: 'image/png',
              });

              sampleUrls.push(result.url);
            } catch (downloadError) {
              console.error('Failed to download sample image:', downloadError);
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
      replicateModelVersion: versionToUse,
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
