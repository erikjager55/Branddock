// =============================================================
// Runway ML Client Singleton
//
// Singleton pattern (matching elevenlabs-client.ts). Methods:
//  - generateVideo() → video Buffer from text prompt
//
// Requires RUNWAYML_API_SECRET in environment.
// =============================================================

import RunwayML from '@runwayml/sdk';

// ─── Types ─────────────────────────────────────────────────

export interface RunwayVideoOptions {
  /** Video duration in seconds (2-10 for gen4.5). Default: 5 */
  duration?: number;
  /** Aspect ratio. Default: '16:9' */
  ratio?: '16:9' | '9:16';
  /** Whether to include a watermark. Default: false */
  watermark?: boolean;
}

export interface RunwayVideoResult {
  videoBytes: Buffer;
  mimeType: string;
  duration: number;
}

/** Map user-facing ratios to Runway SDK resolution format. */
const RATIO_MAP: Record<string, '1280:720' | '720:1280'> = {
  '16:9': '1280:720',
  '9:16': '720:1280',
};

// ─── Singleton ─────────────────────────────────────────────

const globalForRunway = globalThis as unknown as {
  runwayClient: RunwayML | undefined;
};

function getClient(): RunwayML {
  const apiKey = process.env.RUNWAYML_API_SECRET;
  if (!apiKey) {
    throw new Error(
      'RUNWAYML_API_SECRET is not set. Add it to .env.local to enable video generation.',
    );
  }

  if (!globalForRunway.runwayClient) {
    globalForRunway.runwayClient = new RunwayML({ apiKey });
  }

  return globalForRunway.runwayClient;
}

/** Check whether Runway ML API key is configured. */
export function isRunwayConfigured(): boolean {
  return !!process.env.RUNWAYML_API_SECRET;
}

// ─── Public API ────────────────────────────────────────────

/**
 * Generate a video from a text prompt using Runway ML.
 * Creates a text-to-video task, polls until completion, and returns the video bytes.
 * Timeout: 180s (videos typically take 30-120s to generate).
 */
export async function generateVideo(
  prompt: string,
  options?: RunwayVideoOptions,
): Promise<RunwayVideoResult> {
  const client = getClient();
  const duration = options?.duration ?? 5;
  const ratioKey = options?.ratio ?? '16:9';
  const ratio = RATIO_MAP[ratioKey] ?? '1280:720';

  // Create text-to-video task
  const task = await client.textToVideo.create({
    model: 'gen4.5',
    promptText: prompt,
    duration,
    ratio,
    watermark: options?.watermark ?? false,
  });

  // Poll until completion (max 180s)
  const maxWaitMs = 180_000;
  const pollIntervalMs = 3_000;
  const startTime = Date.now();

  let result = await client.tasks.retrieve(task.id);

  while (result.status !== 'SUCCEEDED' && result.status !== 'FAILED') {
    if (Date.now() - startTime > maxWaitMs) {
      throw new Error('Video generation timed out after 180 seconds.');
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    result = await client.tasks.retrieve(task.id);
  }

  if (result.status === 'FAILED') {
    const errorMsg = result.failure ?? 'Unknown error';
    throw new Error(`Runway video generation failed: ${errorMsg}`);
  }

  // Download the generated video
  const outputUrl = (result.output as string[] | undefined)?.[0];
  if (!outputUrl) {
    throw new Error('Runway task succeeded but no output URL was returned.');
  }

  const videoResponse = await fetch(outputUrl);
  if (!videoResponse.ok) {
    throw new Error(`Failed to download generated video: ${videoResponse.status}`);
  }

  const arrayBuffer = await videoResponse.arrayBuffer();
  const videoBytes = Buffer.from(arrayBuffer);

  return {
    videoBytes,
    mimeType: 'video/mp4',
    duration,
  };
}
