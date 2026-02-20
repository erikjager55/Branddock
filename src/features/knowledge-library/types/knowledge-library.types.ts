import type { ResourceType, ResourceSource, DifficultyLevel } from "@prisma/client";

export type { ResourceType, ResourceSource, DifficultyLevel };

export interface ResourceWithMeta {
  id: string;
  title: string;
  slug: string | null;
  description: string;
  type: ResourceType;
  category: string;
  author: string;
  url: string | null;
  estimatedDuration: string | null;
  rating: number;
  isFavorite: boolean;
  isFeatured: boolean;
  createdAt: string;
}

export interface ResourceDetailResponse extends ResourceWithMeta {
  url: string;
  source: ResourceSource;
  difficultyLevel: DifficultyLevel;
  tags: string[];
  publicationDate: string | null;
  isbn: string | null;
  pageCount: number | null;
  fileName: string | null;
  fileSize: number | null;
  fileType: string | null;
  fileUrl: string | null;
  importedMetadata: unknown;
  isArchived: boolean;
  updatedAt: string;
}

export interface CreateResourceBody {
  title: string;
  author: string;
  category: string;
  type: ResourceType;
  url: string;
  description?: string;
  difficultyLevel?: DifficultyLevel;
  estimatedDuration?: string;
  tags?: string[];
  rating?: number;
  publicationDate?: string;
  isbn?: string;
  pageCount?: number;
}

export interface ImportUrlBody {
  url: string;
}

export interface ImportUrlResponse {
  detectedType: ResourceType;
  title: string | null;
  author: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  platform: string;
  metadata: Record<string, unknown>;
}

export interface ResourceListParams {
  search?: string;
  type?: ResourceType;
  category?: string;
  isArchived?: boolean;
}

export interface ResourceListResponse {
  resources: ResourceWithMeta[];
  total: number;
}

export interface FeaturedListResponse {
  resources: ResourceWithMeta[];
}
