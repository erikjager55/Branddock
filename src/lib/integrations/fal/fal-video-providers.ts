// =============================================================
// fal.ai Video Provider Registry
//
// Shared metadata for all fal.ai video generation providers.
// Consumed by the AI Studio (Videos tab) for model selection
// and generation configuration.
// =============================================================

// ─── Types ───────────────────────────────────────────────────

export interface FalVideoProvider {
  /**
   * Stable id used as the DB `provider` value and the URL slug.
   */
  id: string;
  /**
   * The fal.ai endpoint for image-to-video, passed to `fal.subscribe()`.
   */
  endpoint: string;
  /**
   * The fal.ai endpoint for text-to-video (no source image).
   * Falls back to `endpoint` when not set (some models use the same endpoint for both).
   */
  textToVideoEndpoint?: string;
  label: string;
  description: string;
  cost: string;
  /** Preview image path (relative to /images/fal-providers/) */
  preview: string;
  /** Maximum duration in seconds */
  maxDuration: number;
  /** Supported aspect ratios */
  aspectRatios: string[];
  /** Whether this model supports audio generation */
  supportsAudio: boolean;
  /** The input field name for the source image URL (most use image_url, Kling uses start_image_url) */
  imageUrlField: string;
  /** Whether this model supports text-to-video (without a source image) */
  supportsTextToVideo: boolean;
  /** Allowed duration values in seconds (model-specific) */
  allowedDurations: number[];
}

// ─── Registry ────────────────────────────────────────────────

/** All available video generation providers (superset) */
const ALL_FAL_VIDEO_PROVIDERS: Record<string, FalVideoProvider> = {
  'kling-v3-pro': {
    id: 'kling-v3-pro',
    endpoint: 'fal-ai/kling-video/v3/pro/image-to-video',
    textToVideoEndpoint: 'fal-ai/kling-video/v3/pro/text-to-video',
    label: 'Kling v3 Pro',
    description: 'Best overall quality. Cinematic motion, accurate physics, and natural transitions.',
    cost: '$0.11/sec',
    preview: 'kling-v3-pro.svg',
    maxDuration: 15,
    aspectRatios: ['16:9', '9:16', '1:1'],
    supportsAudio: true,
    imageUrlField: 'start_image_url',
    supportsTextToVideo: true,
    allowedDurations: [6, 8, 10],
  },
  'veo-3-1-fast': {
    id: 'veo-3-1-fast',
    endpoint: 'fal-ai/veo3.1/fast/image-to-video',
    textToVideoEndpoint: 'fal-ai/veo3.1/fast',
    label: 'Veo 3.1 Fast',
    description: "Google's video model. Smooth motion, natural lighting, and fast generation at up to 4K.",
    cost: '$0.10/sec',
    preview: 'veo-3-1-fast.svg',
    maxDuration: 8,
    aspectRatios: ['16:9', '9:16', 'auto'],
    supportsAudio: true,
    imageUrlField: 'image_url',
    supportsTextToVideo: true,
    allowedDurations: [4, 6, 8],
  },
  'seedance-2-0': {
    id: 'seedance-2-0',
    endpoint: 'bytedance/seedance-2.0/image-to-video',
    textToVideoEndpoint: 'bytedance/seedance-2.0/text-to-video',
    label: 'Seedance 2.0',
    description: 'Most flexible aspect ratios (7 options). Handles complex scenes with consistent motion.',
    cost: '$0.30/sec',
    preview: 'seedance-2-0.svg',
    maxDuration: 15,
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    supportsAudio: true,
    imageUrlField: 'image_url',
    supportsTextToVideo: true,
    allowedDurations: [4, 6, 8, 10, 15],
  },
  'ltx-2-pro': {
    id: 'ltx-2-pro',
    endpoint: 'fal-ai/ltx-2/image-to-video',
    textToVideoEndpoint: 'fal-ai/ltx-2/text-to-video',
    label: 'LTX 2.0 Pro',
    description: 'Most affordable. Good for drafts and quick iterations. Up to 4K resolution.',
    cost: '$0.06/sec',
    preview: 'ltx-2-pro.svg',
    maxDuration: 10,
    aspectRatios: ['16:9'],
    supportsAudio: true,
    imageUrlField: 'image_url',
    supportsTextToVideo: true,
    allowedDurations: [6, 8, 10],
  },
  'kling-v3-std': {
    id: 'kling-v3-std',
    endpoint: 'fal-ai/kling-video/v3/standard/image-to-video',
    textToVideoEndpoint: 'fal-ai/kling-video/v3/standard/text-to-video',
    label: 'Kling v3 Standard',
    description: 'Budget-friendly version of Kling v3 with audio generation support.',
    cost: '$0.08/sec',
    preview: 'kling-v3-std.svg',
    maxDuration: 15,
    aspectRatios: ['16:9', '9:16', '1:1'],
    supportsAudio: true,
    imageUrlField: 'start_image_url',
    supportsTextToVideo: true,
    allowedDurations: [6, 8, 10],
  },
};

// ─── Public API ──────────────────────────────────────────────

/** Default video provider id */
export const DEFAULT_VIDEO_PROVIDER = 'kling-v3-pro';

/** Flat list of all video providers (for API validation, detail panels, full grid) */
export const FAL_VIDEO_PROVIDERS: FalVideoProvider[] = Object.values(ALL_FAL_VIDEO_PROVIDERS);

/** Lookup a single video provider by id — returns null if unknown. */
export function getFalVideoProviderById(id: string): FalVideoProvider | null {
  return ALL_FAL_VIDEO_PROVIDERS[id] ?? null;
}
