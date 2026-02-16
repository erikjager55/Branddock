// =============================================================
// Knowledge types — Mock formats (UI) + DB model + API contracts
// =============================================================

/** Simple knowledge item (mock-knowledge.ts format) */
export interface Knowledge {
  id: string;
  title: string;
  category: 'best-practice' | 'case-study' | 'research' | 'framework' | 'insight';
  description: string;
  source?: string;
  industry?: string;
  applicability: 'universal' | 'industry-specific' | 'niche';
  keyTakeaway?: string;
}

/** Rich knowledge resource (knowledge-resources.ts format) */
export interface KnowledgeResource {
  id: string;
  type: 'book' | 'video' | 'website' | 'image' | 'document' | 'podcast' | 'article' | 'course';
  title: string;
  description: string;
  author: string;
  category: string;
  tags: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  url: string;
  thumbnail?: string;
  fileSize?: string;
  format?: string;
  publicationDate?: string;
  isbn?: string;
  estimatedDuration?: string;
  pageCount?: number;
  rating: number;
  reviewCount?: number;
  qualityScore?: number;
  status: 'available' | 'archived' | 'pending' | 'unavailable';
  dateAdded: string;
  dateUpdated?: string;
  addedBy?: string;
  views?: number;
  favorites?: number;
  completions?: number;
  relatedTrends?: string[];
  relatedPersonas?: string[];
  relatedAssets?: string[];
  relatedResources?: string[];
  collectionIds?: string[];
  aiSummary?: string;
  aiKeyTakeaways?: string[];
  isFavorite?: boolean;
  readingProgress?: number;
  personalNotes?: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  resourceIds: string[];
  type: 'learning-path' | 'research-bundle' | 'custom';
  order?: number;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
  tags?: string[];
  color?: string;
}

export interface ReadingProgress {
  resourceId: string;
  progress: number;
  status: 'not-started' | 'in-progress' | 'completed';
  timeSpent: number;
  lastAccessed: string;
  notes?: string;
  bookmarks?: number[];
}

/** DB-format Knowledge returned by API */
export interface KnowledgeWithMeta {
  id: string;
  title: string;
  description: string;
  type: string;
  author: string;
  category: string;
  tags: string[];
  difficulty: string | null;
  language: string;
  url: string;
  thumbnail: string | null;
  rating: number;
  status: string;
  addedBy: string | null;
  aiSummary: string | null;
  aiKeyTakeaways: string[] | null;
  relatedTrends: string[] | null;
  relatedPersonas: string[] | null;
  relatedAssets: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeListResponse {
  resources: KnowledgeWithMeta[];
  stats: {
    total: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  };
}

export interface KnowledgeListParams {
  type?: string;
  category?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateKnowledgeBody {
  title: string;
  description?: string;
  type?: string;
  author?: string;
  category?: string;
  tags?: string[];
  difficulty?: string;
  language?: string;
  url?: string;
  thumbnail?: string;
  rating?: number;
  aiSummary?: string;
  aiKeyTakeaways?: string[];
  relatedTrends?: string[];
  relatedPersonas?: string[];
  relatedAssets?: string[];
}

export interface UpdateKnowledgeBody extends Partial<CreateKnowledgeBody> {
  status?: string;
}
