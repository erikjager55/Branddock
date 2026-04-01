// =============================================================
// Replicate Client
//
// Singleton pattern (matching elevenlabs-client.ts). Methods:
//  - isReplicateConfigured()       -> check API token
//  - createModel()                 -> create a model on Replicate
//  - uploadTrainingFile()          -> upload zip via Files API
//  - startTraining()               -> start Flux LoRA training
//  - getTraining()                 -> check training status
//  - runPrediction()               -> generate images from trained model
//
// Requires REPLICATE_API_TOKEN in environment.
// API docs: https://replicate.com/docs
// =============================================================

import Replicate from 'replicate';

// ─── Constants ──────────────────────────────────────────────

const FLUX_TRAINER = 'ostris/flux-dev-lora-trainer' as const;
const FLUX_TRAINER_VERSION = '26dce37af90b9d997eeb970d92e47de3064d46c300504ae376c75bef6a9022d2';

// ─── Types ──────────────────────────────────────────────────

export interface ReplicateTrainingConfig {
  steps?: number;
  learningRate?: number;
  resolution?: number;
  triggerWord?: string;
  autocaption?: boolean;
}

export interface ReplicateTrainingResult {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  model?: string;
  version?: string;
  output?: Record<string, unknown>;
  error?: string | null;
  urls?: { get: string; cancel: string };
  logs?: string | null;
}

export interface ReplicatePredictionResult {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string[] | null;
  error?: string | null;
}

export interface CreateModelResult {
  owner: string;
  name: string;
  url: string;
  visibility: string;
}

export interface ReplicateFileResult {
  id: string;
  name: string;
  content_type: string;
  urls: { get: string };
}

// ─── Singleton ──────────────────────────────────────────────

const globalForReplicate = globalThis as unknown as {
  replicateClient: Replicate | undefined;
};

function getClient(): Replicate {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error(
      'REPLICATE_API_TOKEN is not set. Add it to .env.local to enable consistent model training.',
    );
  }

  if (!globalForReplicate.replicateClient) {
    globalForReplicate.replicateClient = new Replicate({ auth: token });
  }

  return globalForReplicate.replicateClient;
}

/** Check whether Replicate API token is configured. */
export function isReplicateConfigured(): boolean {
  return !!process.env.REPLICATE_API_TOKEN;
}

// ─── Model Management ───────────────────────────────────────

/** Create a model on Replicate (needed before training a LoRA) */
export async function createReplicateModel(
  name: string,
  description?: string,
): Promise<CreateModelResult> {
  const owner = process.env.REPLICATE_MODEL_OWNER;
  if (!owner) {
    throw new Error('REPLICATE_MODEL_OWNER is not set.');
  }

  const client = getClient();

  try {
    const model = await client.models.create(owner, name, {
      visibility: 'private',
      hardware: 'gpu-l40s',
      description: description ?? `Branddock fine-tuned model: ${name}`,
    });

    return {
      owner: model.owner,
      name: model.name,
      url: model.url,
      visibility: model.visibility,
    };
  } catch (error: unknown) {
    // If model already exists, that's fine — just return its info
    if (error instanceof Error && error.message.includes('already exists')) {
      return {
        owner,
        name,
        url: `https://replicate.com/${owner}/${name}`,
        visibility: 'private',
      };
    }
    throw error;
  }
}

// ─── File Upload ────────────────────────────────────────────

/** Upload a zip file of training images via the Replicate Files API */
export async function uploadTrainingFile(
  zipBuffer: Buffer,
  fileName: string,
): Promise<ReplicateFileResult> {
  const client = getClient();

  const file = await client.files.create(
    new Blob([new Uint8Array(zipBuffer)], { type: 'application/zip' }),
    { filename: fileName, content_type: 'application/zip' },
  );

  return {
    id: file.id,
    name: fileName,
    content_type: 'application/zip',
    urls: { get: file.urls.get },
  };
}

// ─── Training ───────────────────────────────────────────────

/** Start Flux LoRA fine-tuning on Replicate */
export async function startReplicateTraining(
  modelOwner: string,
  modelName: string,
  inputImagesUrl: string,
  config: ReplicateTrainingConfig,
  webhookUrl?: string,
): Promise<ReplicateTrainingResult> {
  const client = getClient();

  const training = await client.trainings.create(
    FLUX_TRAINER.split('/')[0],
    FLUX_TRAINER.split('/')[1],
    FLUX_TRAINER_VERSION,
    {
      destination: `${modelOwner}/${modelName}`,
      input: {
        input_images: inputImagesUrl,
        steps: config.steps ?? 1000,
        learning_rate: config.learningRate ?? 0.0004,
        resolution: config.resolution
          ? `${config.resolution}`
          : '512,768,1024',
        trigger_word: config.triggerWord ?? 'TOK',
        autocaption: config.autocaption ?? true,
      },
      webhook: webhookUrl,
      webhook_events_filter: webhookUrl
        ? ['completed']
        : undefined,
    },
  );

  return {
    id: training.id,
    status: training.status as ReplicateTrainingResult['status'],
    model: training.model,
    version: training.version,
    output: training.output as Record<string, unknown> | undefined,
    error: (typeof training.error === 'string' ? training.error : null) as string | null,
    urls: training.urls,
  };
}

/** Get training status by ID */
export async function getReplicateTraining(
  trainingId: string,
): Promise<ReplicateTrainingResult> {
  const client = getClient();

  const training = await client.trainings.get(trainingId);

  return {
    id: training.id,
    status: training.status as ReplicateTrainingResult['status'],
    model: training.model,
    version: training.version,
    output: training.output as Record<string, unknown> | undefined,
    error: (typeof training.error === 'string' ? training.error : null) as string | null,
    urls: training.urls,
    logs: typeof training.logs === 'string' ? training.logs : null,
  };
}

/** Cancel an in-progress training */
export async function cancelReplicateTraining(
  trainingId: string,
): Promise<void> {
  const client = getClient();
  await client.trainings.cancel(trainingId);
}

// ─── Prediction (Image Generation) ─────────────────────────

/** Generate images using a trained model version */
export async function runReplicatePrediction(
  modelVersion: string,
  input: {
    prompt: string;
    num_outputs?: number;
    guidance_scale?: number;
    output_format?: 'png' | 'jpg' | 'webp';
    num_inference_steps?: number;
    seed?: number;
    width?: number;
    height?: number;
  },
): Promise<ReplicatePredictionResult> {
  const client = getClient();

  const prediction = await client.predictions.create({
    version: modelVersion,
    input: {
      prompt: input.prompt,
      num_outputs: input.num_outputs ?? 1,
      guidance_scale: input.guidance_scale ?? 7.5,
      output_format: input.output_format ?? 'png',
      num_inference_steps: input.num_inference_steps ?? 28,
      seed: input.seed,
      width: input.width,
      height: input.height,
    },
  });

  // Wait for completion
  const result = await client.wait(prediction);

  return {
    id: result.id,
    status: result.status as ReplicatePredictionResult['status'],
    output: result.output as string[] | null,
    error: (typeof result.error === 'string' ? result.error : null) as string | null,
  };
}

// ─── Webhook Verification ───────────────────────────────────

/** Verify Replicate webhook signature (svix standard) */
export async function verifyReplicateWebhook(
  body: string,
  headers: {
    webhookId: string | null;
    webhookTimestamp: string | null;
    webhookSignature: string | null;
  },
): Promise<boolean> {
  const secret = process.env.REPLICATE_WEBHOOK_SECRET;
  if (!secret) {
    // No secret configured — skip verification in development
    return true;
  }

  const { webhookId, webhookTimestamp, webhookSignature } = headers;
  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return false;
  }

  // Replicate uses svix-style HMAC verification
  // The signed content is: "{webhook_id}.{timestamp}.{body}"
  const crypto = await import('crypto');
  const signedContent = `${webhookId}.${webhookTimestamp}.${body}`;

  // Secret is base64-encoded, prefixed with "whsec_"
  const secretBytes = Buffer.from(
    secret.startsWith('whsec_') ? secret.slice(6) : secret,
    'base64',
  );

  const expectedSignature = crypto
    .createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64');

  // Signature header may have multiple signatures separated by spaces
  const signatures = webhookSignature.split(' ');
  return signatures.some((sig) => {
    const sigValue = sig.startsWith('v1,') ? sig.slice(3) : sig;
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(sigValue),
      );
    } catch {
      return false;
    }
  });
}
