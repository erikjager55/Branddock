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
