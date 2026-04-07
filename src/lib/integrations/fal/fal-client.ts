/**
 * fal.ai API client for AI model training (LoRA fine-tuning) and image generation.
 * Singleton pattern matching other integration clients (elevenlabs, openai).
 *
 * Uses the @fal-ai/client SDK with queue-based async operations.
 * Env var: FAL_KEY (auto-detected by the SDK).
 */

import { fal } from '@fal-ai/client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** @deprecated Use FAL_MODEL_CONFIG per type instead. Kept as fallback. */
const FLUX_LORA_TRAINER = 'fal-ai/flux-lora-fast-training';
const FLUX_LORA_GENERATOR = 'fal-ai/flux-lora';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FalTrainingConfig {
  steps?: number;
  learningRate?: number;
  triggerWord?: string;
  resolution?: number;
  autocaption?: boolean;
}

export interface FalTrainingResult {
  requestId: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  loraUrl?: string;
  configUrl?: string;
  logs?: string;
  error?: string;
}

export interface FalGenerationInput {
  prompt: string;
  loras?: Array<{ path: string; scale?: number }>;
  num_images?: number;
  guidance_scale?: number;
  image_size?: string | { width: number; height: number };
  seed?: number;
  num_inference_steps?: number;
  output_format?: string;
  [key: string]: unknown;
}

export interface FalGenerationImage {
  url: string;
  width?: number;
  height?: number;
  content_type?: string;
}

export interface FalGenerationResult {
  images: FalGenerationImage[];
  seed?: number;
  prompt?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

let falConfigured = false;

function ensureConfigured(): void {
  if (falConfigured) return;

  const apiKey = process.env.FAL_KEY;
  if (!apiKey) {
    throw new Error(
      'FAL_KEY environment variable is not set. fal.ai integration is not available.'
    );
  }

  fal.config({ credentials: apiKey });
  falConfigured = true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether fal.ai is configured (FAL_KEY env var present).
 */
export function isFalConfigured(): boolean {
  return !!process.env.FAL_KEY;
}

/**
 * Upload a zip buffer of training images to fal.ai storage.
 * Returns a URL that can be passed to the training endpoint.
 */
export async function uploadTrainingImages(
  zipBuffer: Buffer,
  fileName: string
): Promise<string> {
  ensureConfigured();

  const bytes = new Uint8Array(zipBuffer);
  const blob = new Blob([bytes], { type: 'application/zip' });
  const file = new File([blob], fileName, { type: 'application/zip' });
  const url = await fal.storage.upload(file);
  return url;
}

/**
 * Start a LoRA fine-tuning job on fal.ai.
 * Returns the queue request ID for status polling.
 * @param trainerEndpoint Override the default trainer model (e.g., 'fal-ai/flux-2-trainer')
 */
export async function startFalTraining(
  imageUrl: string,
  config: FalTrainingConfig,
  trainerEndpoint?: string
): Promise<{ requestId: string }> {
  ensureConfigured();

  const endpoint = trainerEndpoint ?? FLUX_LORA_TRAINER;

  // flux-2-trainer uses "image_data_url" (singular), older trainers use "images_data_url" (plural)
  const isFlux2 = endpoint.includes('flux-2-trainer');
  const imageUrlKey = isFlux2 ? 'image_data_url' : 'images_data_url';

  const triggerWord = config.triggerWord ?? 'ohwx';

  const result = await fal.queue.submit(endpoint, {
    input: {
      [imageUrlKey]: imageUrl,
      trigger_word: triggerWord,
      steps: config.steps ?? 1000,
      ...(config.learningRate != null && { learning_rate: config.learningRate }),
      ...(config.resolution != null && { resolution: config.resolution }),
      // flux-2-trainer requires default_caption instead of autocaption
      ...(isFlux2
        ? { default_caption: `a photo of ${triggerWord}` }
        : config.autocaption != null ? { autocaption: config.autocaption } : {}),
    } as never,
  });

  return { requestId: result.request_id };
}

/**
 * Poll the status of a fal.ai training job.
 * @param trainerEndpoint The trainer model used (stored in DB trainingConfig.falTrainer)
 */
export async function getFalTrainingStatus(
  requestId: string,
  trainerEndpoint?: string
): Promise<FalTrainingResult> {
  ensureConfigured();

  const endpoint = trainerEndpoint ?? FLUX_LORA_TRAINER;
  const status = await fal.queue.status(endpoint, {
    requestId,
    logs: true,
  });

  const responseStatus = status.status as string;

  // Extract logs if available
  const logs =
    'logs' in status && Array.isArray(status.logs)
      ? status.logs.map((l: { message: string }) => l.message).join('\n')
      : undefined;

  if (responseStatus === 'COMPLETED') {
    return {
      requestId,
      status: 'COMPLETED',
      logs,
    };
  }

  if (responseStatus === 'FAILED') {
    const statusObj = status as unknown as Record<string, unknown>;
    return {
      requestId,
      status: 'FAILED',
      error: statusObj.error ? String(statusObj.error) : 'Training failed',
      logs,
    };
  }

  // IN_QUEUE or IN_PROGRESS
  return {
    requestId,
    status: responseStatus === 'IN_QUEUE' ? 'IN_QUEUE' : 'IN_PROGRESS',
    logs,
  };
}

/**
 * Retrieve the final result of a completed training job.
 * Returns the LoRA weights URL.
 * @param trainerEndpoint The trainer model used (stored in DB trainingConfig.falTrainer)
 */
export async function getFalTrainingResult(
  requestId: string,
  trainerEndpoint?: string
): Promise<FalTrainingResult> {
  ensureConfigured();

  const endpoint = trainerEndpoint ?? FLUX_LORA_TRAINER;
  const result = await fal.queue.result(endpoint, { requestId });

  // The training output contains diffusers_lora_file with the LoRA weights URL
  const data = result.data as Record<string, unknown>;
  const diffusersLoraFile = data?.diffusers_lora_file as
    | { url?: string }
    | undefined;
  const configFile = data?.config_file as { url?: string } | undefined;

  return {
    requestId,
    status: 'COMPLETED',
    loraUrl: diffusersLoraFile?.url,
    configUrl: configFile?.url,
  };
}

/**
 * Generate images using a trained LoRA model on fal.ai.
 * Uses fal.subscribe for convenience (polls queue internally).
 */
export async function runFalGeneration(
  endpoint: string,
  input: FalGenerationInput
): Promise<FalGenerationResult> {
  ensureConfigured();

  const result = await fal.subscribe(endpoint || FLUX_LORA_GENERATOR, {
    input,
  });

  const data = result.data as Record<string, unknown>;
  const images = (data?.images as FalGenerationImage[]) ?? [];

  return {
    images,
    seed: data?.seed as number | undefined,
    prompt: data?.prompt as string | undefined,
  };
}

/**
 * Cancel a running training job.
 */
export async function cancelFalTraining(
  requestId: string,
  trainerEndpoint?: string
): Promise<void> {
  ensureConfigured();

  const endpoint = trainerEndpoint ?? FLUX_LORA_TRAINER;
  await fal.queue.cancel(endpoint, { requestId });
}

// ---------------------------------------------------------------------------
// Standalone Image Generation (for reference image generation)
// ---------------------------------------------------------------------------

export interface FalStandaloneGenerationOptions {
  imageSize?: string;
  seed?: number;
  numImages?: number;
}

/** Models that use aspect_ratio + resolution instead of image_size */
const ASPECT_RATIO_MODELS = new Set([
  'fal-ai/nano-banana-pro',
  'fal-ai/phota',
]);

/** Map image_size preset to aspect_ratio string */
function toAspectRatio(imageSize: string): string {
  const map: Record<string, string> = {
    'square_hd': '1:1',
    'landscape_16_9': '16:9',
    'portrait_16_9': '9:16',
    'landscape_4_3': '4:3',
    'portrait_4_3': '3:4',
  };
  return map[imageSize] ?? '1:1';
}

/**
 * Generate images using any fal.ai model (not LoRA-based).
 * Automatically adapts input format per model (image_size vs aspect_ratio).
 */
export async function generateFalImage(
  modelId: string,
  prompt: string,
  options?: FalStandaloneGenerationOptions
): Promise<FalGenerationResult> {
  ensureConfigured();

  const useAspectRatio = ASPECT_RATIO_MODELS.has(modelId);
  const imageSize = options?.imageSize ?? 'square_hd';

  const input: Record<string, unknown> = {
    prompt,
    num_images: options?.numImages ?? 1,
    ...(options?.seed != null ? { seed: options.seed } : {}),
    ...(useAspectRatio
      ? { aspect_ratio: toAspectRatio(imageSize), resolution: '1K' }
      : { image_size: imageSize }),
  };

  const result = await fal.subscribe(modelId, { input });

  const data = result.data as Record<string, unknown>;
  const images = (data?.images as FalGenerationImage[]) ?? [];

  return {
    images,
    seed: data?.seed as number | undefined,
    prompt: data?.prompt as string | undefined,
  };
}
