// =============================================================
// Astria.ai Client Singleton
//
// Singleton pattern (matching elevenlabs-client.ts). Methods:
//  - isAstriaConfigured()           → check API key
//  - createTune()                   → start fine-tuning
//  - getTune()                      → check training status
//  - deleteTune()                   → remove trained model
//  - createPrompt()                 → generate image(s)
//  - getPrompt()                    → check generation status
//
// Requires ASTRIA_API_KEY in environment.
// API docs: https://docs.astria.ai/docs/api/overview/
// =============================================================

const ASTRIA_BASE_URL = 'https://api.astria.ai';
const REQUEST_TIMEOUT_MS = 30_000;

// ─── Types ─────────────────────────────────────────────────

export interface AstriaTune {
  id: number;
  title: string;
  name: string;
  token: string;
  branch: string;
  model_type: string | null;
  trained_at: string | null;
  started_training_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  url: string;
  orig_images: string[];
  ckpt_url: string | null;
  base_tune_id: number | null;
}

export interface AstriaPrompt {
  id: number;
  tune_id: number;
  text: string;
  negative_prompt: string | null;
  cfg_scale: number | null;
  steps: number | null;
  seed: number | null;
  num_images: number | null;
  callback: string | null;
  url: string | null;
  images: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateTuneParams {
  title: string;
  name: string;
  imageUrls: string[];
  branch?: 'flux1' | 'sd15' | 'sdxl1' | 'fast';
  modelType?: 'lora' | 'pti' | 'faceid' | null;
  token?: string;
  steps?: number;
  callback?: string;
  faceCrop?: boolean;
  preset?: 'flux-lora-focus' | 'flux-lora-portrait' | 'flux-lora-fast' | null;
}

export interface CreatePromptParams {
  text: string;
  negativePrompt?: string;
  numImages?: number;
  seed?: number;
  width?: number;
  height?: number;
  cfgScale?: number;
  steps?: number;
  superResolution?: boolean;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '3:2' | '2:3' | '4:3' | '3:4';
  callback?: string;
  scheduler?: string;
}

// ─── Client ─────────────────────────────────────────────────

class AstriaClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${ASTRIA_BASE_URL}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.apiKey}`,
      };

      const init: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body) {
        headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(body);
      }

      const response = await fetch(url, init);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(
          `Astria API error ${response.status}: ${errorText}`
        );
      }

      // DELETE returns 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Create a new fine-tune (training job) */
  async createTune(params: CreateTuneParams): Promise<AstriaTune> {
    const body: Record<string, unknown> = {
      tune: {
        title: params.title,
        name: params.name,
        image_urls: params.imageUrls,
        branch: params.branch ?? 'flux1',
        model_type: params.modelType ?? 'lora',
        token: params.token ?? 'ohwx',
        callback: params.callback,
        face_crop: params.faceCrop,
        preset: params.preset,
      },
    };

    if (params.steps) {
      (body.tune as Record<string, unknown>).steps = params.steps;
    }

    return this.request<AstriaTune>('POST', '/tunes', body);
  }

  /** Get a tune by ID (check training status) */
  async getTune(tuneId: number): Promise<AstriaTune> {
    return this.request<AstriaTune>('GET', `/tunes/${tuneId}`);
  }

  /** List all tunes for the account */
  async listTunes(): Promise<AstriaTune[]> {
    return this.request<AstriaTune[]>('GET', '/tunes');
  }

  /** Delete a tune */
  async deleteTune(tuneId: number): Promise<void> {
    await this.request<void>('DELETE', `/tunes/${tuneId}`);
  }

  /** Create a prompt (generate images) on a trained tune */
  async createPrompt(
    tuneId: number,
    params: CreatePromptParams
  ): Promise<AstriaPrompt> {
    const body: Record<string, unknown> = {
      prompt: {
        text: params.text,
        negative_prompt: params.negativePrompt,
        num_images: params.numImages ?? 1,
        seed: params.seed,
        w: params.width,
        h: params.height,
        cfg_scale: params.cfgScale,
        steps: params.steps,
        super_resolution: params.superResolution,
        aspect_ratio: params.aspectRatio,
        callback: params.callback,
        scheduler: params.scheduler,
      },
    };

    return this.request<AstriaPrompt>(
      'POST',
      `/tunes/${tuneId}/prompts`,
      body
    );
  }

  /** Get a prompt (check generation status / retrieve images) */
  async getPrompt(tuneId: number, promptId: number): Promise<AstriaPrompt> {
    return this.request<AstriaPrompt>(
      'GET',
      `/tunes/${tuneId}/prompts/${promptId}`
    );
  }

  /** List prompts for a tune */
  async listPrompts(tuneId: number): Promise<AstriaPrompt[]> {
    return this.request<AstriaPrompt[]>('GET', `/tunes/${tuneId}/prompts`);
  }
}

// ─── Singleton ─────────────────────────────────────────────

const globalForAstria = globalThis as unknown as {
  astriaClient: AstriaClient | undefined;
};

function getClient(): AstriaClient {
  const apiKey = process.env.ASTRIA_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ASTRIA_API_KEY is not set. Add it to .env.local to enable consistent model training.',
    );
  }

  if (!globalForAstria.astriaClient) {
    globalForAstria.astriaClient = new AstriaClient(apiKey);
  }

  return globalForAstria.astriaClient;
}

/** Check whether Astria API key is configured. */
export function isAstriaConfigured(): boolean {
  return !!process.env.ASTRIA_API_KEY;
}

// ─── Public API ────────────────────────────────────────────

/** Create a fine-tune (training job) */
export async function createTune(
  params: CreateTuneParams
): Promise<AstriaTune> {
  return getClient().createTune(params);
}

/** Get tune details (check training status) */
export async function getTune(tuneId: number): Promise<AstriaTune> {
  return getClient().getTune(tuneId);
}

/** List all tunes */
export async function listTunes(): Promise<AstriaTune[]> {
  return getClient().listTunes();
}

/** Delete a tune */
export async function deleteTune(tuneId: number): Promise<void> {
  return getClient().deleteTune(tuneId);
}

/** Generate image(s) with a trained tune */
export async function createPrompt(
  tuneId: number,
  params: CreatePromptParams
): Promise<AstriaPrompt> {
  return getClient().createPrompt(tuneId, params);
}

/** Get prompt details (check generation / retrieve images) */
export async function getPrompt(
  tuneId: number,
  promptId: number
): Promise<AstriaPrompt> {
  return getClient().getPrompt(tuneId, promptId);
}

/** List prompts for a tune */
export async function listPrompts(tuneId: number): Promise<AstriaPrompt[]> {
  return getClient().listPrompts(tuneId);
}
