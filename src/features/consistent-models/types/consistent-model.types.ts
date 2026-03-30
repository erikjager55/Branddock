// =============================================================
// Consistent Model Types
// =============================================================

// ─── Enums ──────────────────────────────────────────────────

export type ConsistentModelType = "PERSON" | "PRODUCT" | "STYLE" | "OBJECT" | "BRAND_STYLE" | "PHOTOGRAPHY" | "ANIMATION";

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
  astriaModelId: string | null;
  astriaModelUrl: string | null;
  trainingConfig: TrainingConfig | null;
  trainingStartedAt: string | null;
  trainingCompletedAt: string | null;
  trainingError: string | null;
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
  astriaModelId: string | null;
  trainingStartedAt: string | null;
  trainingCompletedAt: string | null;
  trainingError: string | null;
  sampleImageUrls: string[] | null;
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

// ─── Request Bodies ─────────────────────────────────────────

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
