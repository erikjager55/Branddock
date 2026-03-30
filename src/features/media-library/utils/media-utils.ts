/** Generate a URL-safe slug from a name */
export function generateMediaSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Determine MediaType enum value from a MIME type string */
export function detectMediaType(
  mimeType: string
): "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("audio/")) return "AUDIO";
  return "DOCUMENT";
}

/** Map a BrandVoice record to a serializable response object */
export function mapBrandVoice(voice: Record<string, unknown>) {
  return {
    id: voice.id,
    name: voice.name,
    voiceGender: voice.voiceGender,
    voiceAge: voice.voiceAge,
    voiceTone: voice.voiceTone,
    voiceAccent: voice.voiceAccent,
    speakingPace: voice.speakingPace,
    voicePrompt: voice.voicePrompt,
    ttsProvider: voice.ttsProvider,
    ttsVoiceId: voice.ttsVoiceId,
    ttsSettings: voice.ttsSettings,
    sampleAudioUrl: voice.sampleAudioUrl,
    isDefault: voice.isDefault,
    createdAt: (voice.createdAt as Date).toISOString(),
    updatedAt: (voice.updatedAt as Date).toISOString(),
  };
}

/** Safely convert a value to an ISO date string */
function toISOString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

/** Map a SoundEffect record to a serializable response object */
export function mapSoundEffect(sfx: Record<string, unknown>) {
  return {
    id: sfx.id,
    name: sfx.name,
    soundType: sfx.soundType,
    fileUrl: sfx.fileUrl,
    fileName: sfx.fileName,
    fileSize: sfx.fileSize,
    fileType: sfx.fileType,
    duration: sfx.duration,
    prompt: sfx.prompt,
    promptInfluence: sfx.promptInfluence,
    isLooping: sfx.isLooping,
    source: sfx.source,
    isDefault: sfx.isDefault,
    createdAt: toISOString(sfx.createdAt),
    updatedAt: toISOString(sfx.updatedAt),
  };
}

/** Map a GeneratedImage record to a serializable response object */
export function mapGeneratedImage(img: Record<string, unknown>) {
  return {
    id: img.id,
    name: img.name,
    prompt: img.prompt,
    revisedPrompt: img.revisedPrompt,
    provider: img.provider,
    model: img.model,
    fileUrl: img.fileUrl,
    fileName: img.fileName,
    fileSize: img.fileSize,
    fileType: img.fileType,
    width: img.width,
    height: img.height,
    aspectRatio: img.aspectRatio,
    style: img.style,
    quality: img.quality,
    isFavorite: img.isFavorite,
    createdAt: toISOString(img.createdAt),
    updatedAt: toISOString(img.updatedAt),
  };
}

/** Map a StyleReference record to a serializable response object */
export function mapStyleReference(ref: Record<string, unknown>) {
  return {
    id: ref.id,
    name: ref.name,
    type: ref.type,
    stylePrompt: ref.stylePrompt,
    negativePrompt: ref.negativePrompt,
    generationParams: ref.generationParams,
    modelName: ref.modelName,
    modelDescription: ref.modelDescription,
    referenceImages: ref.referenceImages,
    createdAt: (ref.createdAt as Date).toISOString(),
    updatedAt: (ref.updatedAt as Date).toISOString(),
  };
}
