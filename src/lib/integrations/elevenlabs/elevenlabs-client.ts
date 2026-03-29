// =============================================================
// ElevenLabs Client Singleton
//
// Singleton pattern (matching openai-client.ts). Four methods:
//  - listVoices()          → available voices from ElevenLabs library
//  - generateSpeech()      → audio Buffer from text
//  - generateSoundEffect() → audio Buffer from text prompt (SFX)
//  - getVoiceInfo()        → voice metadata
//
// Requires ELEVENLABS_API_KEY in environment.
// =============================================================

import { ElevenLabsClient } from 'elevenlabs';

// ─── Types ─────────────────────────────────────────────────

export interface ElevenLabsVoiceInfo {
  voiceId: string;
  name: string;
  labels: Record<string, string>;
  previewUrl: string | null;
  category: string;
}

export interface VoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export interface SoundEffectOptions {
  durationSeconds?: number;   // 0.5–22
  promptInfluence?: number;   // 0–1, default 0.3
}

// ─── Singleton ─────────────────────────────────────────────

const globalForElevenLabs = globalThis as unknown as {
  elevenLabsClient: ElevenLabsClient | undefined;
};

function getClient(): ElevenLabsClient {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ELEVENLABS_API_KEY is not set. Add it to .env.local to enable TTS features.',
    );
  }

  if (!globalForElevenLabs.elevenLabsClient) {
    globalForElevenLabs.elevenLabsClient = new ElevenLabsClient({ apiKey });
  }

  return globalForElevenLabs.elevenLabsClient;
}

/** Check whether ElevenLabs API key is configured. */
export function isElevenLabsConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}

// ─── Public API ────────────────────────────────────────────

/**
 * List available voices from the ElevenLabs voice library.
 * Returns a simplified array of voice metadata.
 */
export async function listVoices(): Promise<ElevenLabsVoiceInfo[]> {
  const client = getClient();
  const response = await client.voices.getAll();

  const voices = response.voices ?? [];
  return voices.map((v) => ({
    voiceId: v.voice_id,
    name: v.name ?? 'Unknown',
    labels: (v.labels as Record<string, string>) ?? {},
    previewUrl: v.preview_url ?? null,
    category: v.category ?? 'premade',
  }));
}

/**
 * Generate speech audio from text using an ElevenLabs voice.
 * Returns a Buffer containing MP3 audio data.
 */
export async function generateSpeech(
  voiceId: string,
  text: string,
  settings?: VoiceSettings,
): Promise<Buffer> {
  const client = getClient();

  const audioStream = await client.textToSpeech.convert(voiceId, {
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: settings
      ? {
          stability: settings.stability ?? 0.5,
          similarity_boost: settings.similarity_boost ?? 0.75,
          style: settings.style ?? 0,
          use_speaker_boost: settings.use_speaker_boost ?? true,
        }
      : undefined,
  });

  // Collect the readable stream into a Buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of audioStream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Generate a sound effect from a text prompt using ElevenLabs Sound Effects API.
 * Returns a Buffer containing MP3 audio data.
 */
export async function generateSoundEffect(
  text: string,
  options?: SoundEffectOptions,
): Promise<Buffer> {
  const client = getClient();

  const audioStream = await client.textToSoundEffects.convert({
    text,
    duration_seconds: options?.durationSeconds,
    prompt_influence: options?.promptInfluence,
  });

  const chunks: Uint8Array[] = [];
  for await (const chunk of audioStream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Get metadata for a specific ElevenLabs voice.
 */
export async function getVoiceInfo(voiceId: string): Promise<ElevenLabsVoiceInfo> {
  const client = getClient();
  const v = await client.voices.get(voiceId);

  return {
    voiceId: v.voice_id,
    name: v.name ?? 'Unknown',
    labels: (v.labels as Record<string, string>) ?? {},
    previewUrl: v.preview_url ?? null,
    category: v.category ?? 'premade',
  };
}
