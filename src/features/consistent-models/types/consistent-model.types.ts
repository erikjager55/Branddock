// =============================================================
// Consistent Model Types
// =============================================================

import type { IllustrationStyleProfile } from "@/lib/consistent-models/style-profile.types";

// ─── Enums ──────────────────────────────────────────────────

export type ConsistentModelType = "PERSON" | "PRODUCT" | "STYLE" | "OBJECT" | "BRAND_STYLE" | "PHOTOGRAPHY" | "ILLUSTRATION" | "VOICE" | "SOUND_EFFECT";

export type ConsistentModelStatus =
  | "DRAFT"
  | "UPLOADING"
  | "TRAINING"
  | "TRAINING_FAILED"
  | "READY"
  | "ARCHIVED";

// ─── List Item ──────────────────────────────────────────────

/** Model overview (list endpoint) */
export interface ConsistentModelWithMeta {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: ConsistentModelType;
  status: ConsistentModelStatus;
  triggerWord: string | null;
  baseModel: string | null;
  stylePrompt: string | null;
  negativePrompt: string | null;
  thumbnailUrl: string | null;
  sampleImageUrls: string[] | null;
  modelName: string | null;
  modelDescription: string | null;
  generationParams: unknown | null;
  usageCount: number;
  isDefault: boolean;
  referenceImageCount: number;
  generationCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string | null; image: string | null };
}

/** Model list response (GET /api/consistent-models) */
export interface ConsistentModelListResponse {
  models: ConsistentModelWithMeta[];
  stats: ConsistentModelStats;
}

/** Model list query params */
export interface ConsistentModelListParams {
  type?: ConsistentModelType;
  status?: ConsistentModelStatus;
  search?: string;
  sortBy?: "name" | "createdAt" | "usageCount";
  sortOrder?: "asc" | "desc";
}

// ─── Detail ─────────────────────────────────────────────────

/** Full model detail (GET /api/consistent-models/:id) */
export interface ConsistentModelDetail extends ConsistentModelWithMeta {
  falModelId: string | null;
  falLoraUrl: string | null;
  falRequestId: string | null;
  trainingConfig: TrainingConfig | null;
  trainingStartedAt: string | null;
  trainingCompletedAt: string | null;
  trainingError: string | null;
  brandContext: ModelBrandContext | null;
  styleProfile: IllustrationStyleProfile | null;
  styleProfileVersion: number;
  styleAnalysisStatus: string | null;
  referenceImages: ReferenceImageWithMeta[];
}

/** Training configuration stored in DB as JSON */
export interface TrainingConfig {
  steps?: number;
  learningRate?: number;
  resolution?: number;
  [key: string]: unknown;
}

// ─── Reference Image ────────────────────────────────────────

export type ReferenceImageSource = 'UPLOADED' | 'AI_GENERATED';

/** Reference image record */
export interface ReferenceImageWithMeta {
  id: string;
  consistentModelId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  storageKey: string;
  storageUrl: string;
  thumbnailKey: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  sortOrder: number;
  isTrainingImage: boolean;
  source: ReferenceImageSource;
  aiProvider: string | null;
  aiModel: string | null;
  aiPrompt: string | null;
  createdAt: string;
}

// ─── Generation ─────────────────────────────────────────────

/** Generated image record */
export interface GeneratedImageWithMeta {
  id: string;
  consistentModelId: string;
  workspaceId: string;
  prompt: string;
  negativePrompt: string | null;
  seed: number | null;
  width: number;
  height: number;
  guidanceScale: number | null;
  storageKey: string;
  storageUrl: string;
  thumbnailKey: string | null;
  thumbnailUrl: string | null;
  generationTimeMs: number | null;
  aiProvider: string;
  aiModel: string;
  cost: number | null;
  styleValidationScore: number | null;
  styleValidationDetails: import("@/lib/consistent-models/style-profile.types").StyleValidationResult | null;
  createdAt: string;
  createdBy: { id: string; name: string | null; image: string | null };
}

/** Generations list response */
export interface GenerationsListResponse {
  generations: GeneratedImageWithMeta[];
  total: number;
  limit: number;
  offset: number;
}

/** Generations list params */
export interface GenerationsListParams {
  limit?: number;
  offset?: number;
}

// ─── Training Status ────────────────────────────────────────

/** Training status polling response */
export interface TrainingStatusResponse {
  status: ConsistentModelStatus;
  falModelId: string | null;
  falRequestId: string | null;
  trainingStartedAt: string | null;
  trainingCompletedAt: string | null;
  trainingError: string | null;
  sampleImageUrls: string[] | null;
  /** Training progress percentage (0-100), parsed from fal.ai logs */
  progress?: number;
  /** Whether the job is still waiting in fal.ai's queue for a GPU */
  inQueue?: boolean;
}

// ─── Stats ──────────────────────────────────────────────────

/** Workspace-level model stats */
export interface ConsistentModelStats {
  total: number;
  ready: number;
  training: number;
  draft: number;
  totalGenerations: number;
}

// ─── Brand Context ──────────────────────────────────────────

/** Snapshot of brand context resolved at model creation time */
export interface ModelBrandContext {
  type: ConsistentModelType;
  resolvedAt: string;
  contextSummary: string;
  brandName?: string;
  brandColors?: { name: string; hex: string }[];
  brandFonts?: string[];
  brandPersonality?: string;
  toneOfVoice?: string;
  brandImageryStyle?: string;
  brandDesignLanguage?: string;
  brandStyle?: string;
  targetPersonas?: { name: string; description: string }[];
  productInfo?: { name: string; description: string }[];
  competitors?: { name: string; notes: string }[];
  trendInsights?: { title: string; summary: string }[];
  moodKeywords?: string[];
  /** Logo description + guidelines for when the user explicitly requests brand/logo in the image */
  logoContext?: string;
}

// ─── Request Bodies ─────────────────────────────────────────

/** Structured illustration style parameters stored in generationParams */
export interface IllustrationStyleParams {
  illustrationStyle?: string | null;
  colorApproach?: string | null;
  lineQuality?: string | null;
  detailLevel?: string | null;
  mood?: string | null;
}

/** POST /api/consistent-models */
export interface CreateModelBody {
  name: string;
  type: ConsistentModelType;
  description?: string;
  baseModel?: string;
  stylePrompt?: string;
  negativePrompt?: string;
  modelName?: string;
  modelDescription?: string;
  generationParams?: unknown;
}

/** PATCH /api/consistent-models/:id */
export interface UpdateModelBody {
  name?: string;
  description?: string;
  stylePrompt?: string;
  negativePrompt?: string;
  isDefault?: boolean;
  status?: 'ARCHIVED';
  modelName?: string;
  modelDescription?: string;
  generationParams?: unknown;
}

/** POST /api/consistent-models/:id/generate */
export interface GenerateImageBody {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  guidanceScale?: number;
  numImages?: number;
  saveToLibrary?: boolean;
}

/** POST /api/consistent-models/:id/train */
export interface StartTrainingBody {
  steps?: number;
  learningRate?: number;
  resolution?: number;
}

/** Reference image upload response */
export interface UploadReferenceImagesResponse {
  uploaded: ReferenceImageWithMeta[];
  errors: { fileName: string; error: string }[];
  total: number;
}
