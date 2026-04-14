// ─── Enums (mirroring Prisma) ────────────────────────────────

export type MediaType = 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'AUDIO';

export type MediaCategory =
  | 'LOGO' | 'BRAND_MARK' | 'ICON' | 'ILLUSTRATION'
  | 'PHOTOGRAPHY' | 'LIFESTYLE' | 'PRODUCT_PHOTO' | 'TEAM_PHOTO'
  | 'EVENT_PHOTO' | 'HERO_IMAGE' | 'BANNER' | 'SOCIAL_MEDIA'
  | 'ADVERTISEMENT' | 'INFOGRAPHIC' | 'PRESENTATION'
  | 'VIDEO_CONTENT' | 'ANIMATION' | 'AUDIO_CONTENT'
  | 'DOCUMENT_FILE' | 'TEMPLATE' | 'MOCKUP'
  | 'TEXTURE' | 'PATTERN' | 'BACKGROUND' | 'OTHER';

export type MediaSource = 'UPLOAD' | 'URL_IMPORT' | 'AI_GENERATED' | 'SCRAPED' | 'STOCK';

// ─── Media Asset ─────────────────────────────────────────────

export interface MediaTagInfo {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

export interface MediaAssetTag {
  id: string;
  mediaTag: MediaTagInfo;
}

export interface MediaUploader {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface MediaAssetWithMeta {
  id: string;
  name: string;
  slug: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  fileName: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  mediaType: MediaType;
  category: MediaCategory;
  isFavorite: boolean;
  isArchived: boolean;
  isFeatured: boolean;
  thumbnailUrl: string | null;
  aiDescription: string | null;
  aiTags: string[];
  dominantColors: string[];
  source: MediaSource;
  sourceUrl: string | null;
  attribution: string | null;
  productId: string | null;
  tags: MediaAssetTag[];
  uploadedBy: MediaUploader;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAssetDetailResponse extends MediaAssetWithMeta {
  collections: Array<{
    id: string;
    collection: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}

// ─── List / Filter ───────────────────────────────────────────

export interface MediaListParams {
  search?: string;
  mediaType?: MediaType;
  category?: MediaCategory;
  source?: MediaSource;
  tagId?: string;
  collectionId?: string;
  productId?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  sortBy?: 'name' | 'createdAt' | 'fileSize' | 'mediaType';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface MediaStats {
  total: number;
  images: number;
  videos: number;
  documents: number;
  audio: number;
  totalFileSize?: number;
  favorites?: number;
}

export interface MediaListResponse {
  assets: MediaAssetWithMeta[];
  total: number;
  stats: MediaStats;
}

// ─── Create / Update ─────────────────────────────────────────

export interface CreateMediaBody {
  name: string;
  category?: MediaCategory;
  source?: MediaSource;
  sourceUrl?: string;
  attribution?: string;
  productId?: string;
}

export interface UpdateMediaBody {
  name?: string;
  category?: MediaCategory;
  aiDescription?: string;
  aiTags?: string[];
  attribution?: string;
  productId?: string | null;
  tagIds?: string[];
}

// ─── Tags ────────────────────────────────────────────────────

export interface MediaTagWithCount extends MediaTagInfo {
  _count: { assets: number };
  createdAt: string;
}

export interface CreateTagBody {
  name: string;
  color?: string;
}

export interface UpdateTagBody {
  name?: string;
  color?: string;
}

// ─── Collections ─────────────────────────────────────────────

export interface MediaCollectionWithMeta {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  color: string | null;
  parentId: string | null;
  _count: { assets: number; children: number };
  createdAt: string;
  updatedAt: string;
}

export interface MediaCollectionDetail extends MediaCollectionWithMeta {
  assets: Array<{
    id: string;
    sortOrder: number;
    mediaAsset: MediaAssetWithMeta;
  }>;
  children: Array<{
    id: string;
    name: string;
    slug: string;
    _count: { assets: number };
  }>;
}

export interface CreateCollectionBody {
  name: string;
  description?: string;
  color?: string;
  parentId?: string;
}

export interface UpdateCollectionBody {
  name?: string;
  description?: string;
  coverImageUrl?: string;
  color?: string;
}

// ─── ElevenLabs ─────────────────────────────────────────────

export interface ElevenLabsVoice {
  voiceId: string;
  name: string;
  labels: Record<string, string>;
  previewUrl: string | null;
  category: string;
}

// ─── Brand Voice ─────────────────────────────────────────────

export interface BrandVoiceWithMeta {
  id: string;
  name: string;
  voiceGender: string | null;
  voiceAge: string | null;
  voiceTone: string | null;
  voiceAccent: string | null;
  speakingPace: string | null;
  voicePrompt: string | null;
  ttsProvider: string | null;
  ttsVoiceId: string | null;
  ttsSettings: Record<string, unknown> | null;
  sampleAudioUrl: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandVoiceBody {
  name: string;
  voiceGender?: string;
  voiceAge?: string;
  voiceTone?: string;
  voiceAccent?: string;
  speakingPace?: string;
  voicePrompt?: string;
  ttsProvider?: string;
  ttsVoiceId?: string;
  ttsSettings?: Record<string, unknown>;
  isDefault?: boolean;
}

export interface UpdateBrandVoiceBody {
  name?: string;
  voiceGender?: string;
  voiceAge?: string;
  voiceTone?: string;
  voiceAccent?: string;
  speakingPace?: string;
  voicePrompt?: string;
  ttsProvider?: string;
  ttsVoiceId?: string;
  ttsSettings?: Record<string, unknown>;
  sampleAudioUrl?: string;
  isDefault?: boolean;
}

// ─── Sound Effects ──────────────────────────────────────────

export type SoundType = 'SFX' | 'JINGLE' | 'SOUND_LOGO' | 'AMBIENT' | 'MUSIC';

export interface SoundEffectWithMeta {
  id: string;
  name: string;
  soundType: SoundType;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  duration: number | null;
  prompt: string | null;
  promptInfluence: number | null;
  isLooping: boolean;
  source: 'UPLOAD' | 'AI_GENERATED';
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSoundEffectBody {
  name: string;
  soundType?: SoundType;
}

export interface GenerateSoundEffectBody {
  name: string;
  prompt: string;
  soundType?: SoundType;
  durationSeconds?: number;
  promptInfluence?: number;
}

export interface UpdateSoundEffectBody {
  name?: string;
  soundType?: SoundType;
  isDefault?: boolean;
}

// ─── Import ──────────────────────────────────────────────────

export interface ImportUrlBody {
  url: string;
  name?: string;
  category?: MediaCategory;
}

export interface ImportUrlResponse {
  asset: MediaAssetWithMeta;
}

// ─── Stock Photos ────────────────────────────────────────────

export interface StockPhotoResult {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

export interface StockSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: StockPhotoResult[];
  next_page?: string;
}

export interface ImportStockBody {
  photoUrl: string;
  photographer: string;
  photographerUrl: string;
  pexelsUrl: string;
  width: number;
  height: number;
  alt?: string;
}

// ─── AI Images ───────────────────────────────────────────────

/**
 * Image provider id. Known values include built-ins ('IMAGEN' | 'DALLE' |
 * 'TRAINED_MODEL') and fal.ai ids ('fal-ai/flux-2-pro', etc.). Stored as a
 * free-form string in the DB. Legacy values ('FLUX_PRO', 'RECRAFT',
 * 'IDEOGRAM') remain readable but are re-mapped on write.
 */
export type ImageProvider = string;

export interface GeneratedImageWithMeta {
  id: string;
  name: string;
  prompt: string;
  revisedPrompt: string | null;
  provider: ImageProvider;
  model: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  width: number | null;
  height: number | null;
  aspectRatio: string | null;
  style: string | null;
  quality: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateImageBody {
  name: string;
  prompt: string;
  provider: ImageProvider;
  aspectRatio?: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  /** For TRAINED_MODEL provider: single model ID (legacy) */
  trainedModelId?: string;
  /** For TRAINED_MODEL provider: combine multiple trained models (max 3) */
  trainedModelIds?: string[];
  /** Brand context tags injected into the prompt (ignored for TRAINED_MODEL) */
  brandTags?: string[];
  /** Style guideline — what MUST appear in the image */
  dos?: string;
  /** Style guideline — what to AVOID */
  donts?: string;
  /**
   * When true (default), the workspace brand summary (photography guidelines,
   * design language, personality direction) is appended server-side to the
   * generation prompt. Set to false to opt out.
   */
  applyBrandGuidelines?: boolean;
}

export interface UpdateGeneratedImageBody {
  name?: string;
  isFavorite?: boolean;
}

// ─── AI Videos ──────────────────────────────────────────────

export type VideoProvider = 'RUNWAY' | 'KLING' | 'FAL';

export interface GeneratedVideoWithMeta {
  id: string;
  name: string;
  prompt: string;
  provider: VideoProvider;
  model: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  duration: number | null;
  width: number | null;
  height: number | null;
  aspectRatio: string | null;
  thumbnailUrl: string | null;
  status: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateVideoBody {
  name: string;
  prompt: string;
  provider: VideoProvider;
  duration?: 5 | 10;
  aspectRatio?: '16:9' | '9:16';
}

export interface UpdateGeneratedVideoBody {
  name?: string;
  isFavorite?: boolean;
}
